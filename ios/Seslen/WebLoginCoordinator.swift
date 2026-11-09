import AuthenticationServices
import CryptoKit
import Foundation
import Security
import UIKit

@MainActor
final class WebLoginCoordinator: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?
    private let api = SeslenAPI()

    func signIn() async throws -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        let randomStatus = bytes.withUnsafeMutableBytes { pointer in
            SecRandomCopyBytes(kSecRandomDefault, 32, pointer.baseAddress!)
        }
        guard randomStatus == errSecSuccess else { throw SeslenError.invalidLink }

        let verifier = Data(bytes).base64URL
        let digest = SHA256.hash(data: Data(verifier.utf8))
        let challenge = Data(digest).base64URL

        var components = URLComponents(string: SeslenAPI.origin + "/auth/ios/login")!
        components.queryItems = [URLQueryItem(name: "challenge", value: challenge)]
        guard let startURL = components.url else { throw SeslenError.invalidLink }

        let resultURL: URL = try await withCheckedThrowingContinuation { continuation in
            let authentication = ASWebAuthenticationSession(
                url: startURL, callbackURLScheme: "seslen"
            ) { callback, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let callback {
                    continuation.resume(returning: callback)
                } else {
                    continuation.resume(throwing: SeslenError.invalidLink)
                }
            }
            authentication.presentationContextProvider = self
            authentication.prefersEphemeralWebBrowserSession = false
            self.session = authentication
            if !authentication.start() {
                continuation.resume(throwing: SeslenError.invalidLink)
            }
        }
        session = nil

        guard let parts = URLComponents(url: resultURL, resolvingAgainstBaseURL: false),
              parts.scheme == "seslen",
              parts.host == "auth",
              let ticket = parts.queryItems?.first(where: { $0.name == "ticket" })?.value,
              ticket.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil
        else {
            throw SeslenError.invalidLink
        }

        let grant: NativeTokenReply = try await api.post(
            "/api/ios/token", payload: NativeLoginPayload(ticket: ticket, verifier: verifier)
        )
        try SeslenKeychain.save(grant.token)
        return grant.token
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: { $0.isKeyWindow }) ?? ASPresentationAnchor()
    }
}

private extension Data {
    var base64URL: String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
