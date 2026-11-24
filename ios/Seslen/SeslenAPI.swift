import Foundation
import Security

struct AccountReply: Decodable {
    let email: String
    let kind: String
}

struct TVDevice: Identifiable, Decodable, Hashable {
    let id: String
    let name: String
}

struct DevicesReply: Decodable {
    let devices: [TVDevice]
}

struct TVMessage: Identifiable, Decodable {
    let id: String
    let text: String
    let status: String
    let created: Int64

    var statusTitle: String {
        switch status {
        case "seen": return "Görüldü ✓"
        case "delivered": return "Teslim edildi"
        case "failed": return "Gösterilemedi"
        default: return "Beklemede"
        }
    }

    var createdDate: Date {
        Date(timeIntervalSince1970: TimeInterval(created))
    }
}

struct MessagesReply: Decodable {
    let messages: [TVMessage]
}

struct MessagePayload: Encodable {
    let device: String
    let text: String
    let audio: String
    let key: String
}

struct MessageReply: Decodable {
    let id: String
    let status: String
}

struct PairPayload: Encodable {
    let code: String
    let name: String
}

struct PairReply: Decodable {
    let id: String
}

struct NativeLoginPayload: Encodable {
    let ticket: String
    let verifier: String
}

struct NativeTokenReply: Decodable {
    let token: String
    let expiresDays: Int
}

struct AudioReply: Decodable {
    let audio: String
}

struct EmptyPayload: Encodable {}
struct AcknowledgeReply: Decodable { let ok: Bool }

enum SeslenError: LocalizedError {
    case invalidResponse
    case unauthorized
    case server(String)
    case invalidFile
    case invalidLink
    case keychain(OSStatus)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return "Sunucu yanıtı okunamadı."
        case .unauthorized: return "Oturumun sona erdi. Google ile yeniden giriş yap."
        case .server(let value): return value
        case .invalidFile: return "Ses kaydı 5 MB sınırını aşıyor veya boş."
        case .invalidLink: return "Güvenli bağlantı başlatılamadı."
        case .keychain: return "Giriş anahtarı iPhone'da güvenle saklanamadı."
        }
    }
}

struct ErrorReply: Decodable {
    let error: String
}

struct SeslenAPI {
    static let origin = "https://seslen.serula.site"
    static let maxVoiceBytes = 5 * 1024 * 1024

    private func request(
        _ path: String,
        method: String = "GET",
        body: Data? = nil,
        contentType: String = "application/json",
        token: String? = nil
    ) async throws -> Data {
        guard path.hasPrefix("/"), let url = URL(string: Self.origin + path) else {
            throw SeslenError.invalidLink
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 30
        request.cachePolicy = .reloadIgnoringLocalCacheData
        if let token {
            request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = body
            request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw SeslenError.invalidResponse
        }
        guard (200...299).contains(http.statusCode) else {
            if http.statusCode == 401 { throw SeslenError.unauthorized }
            let error = try? JSONDecoder().decode(ErrorReply.self, from: data)
            throw SeslenError.server(error?.error ?? "İşlem tamamlanamadı (HTTP \(http.statusCode)).")
        }
        return data
    }

    func get<T: Decodable>(_ path: String, token: String) async throws -> T {
        try JSONDecoder().decode(
            T.self,
            from: requestData(try await request(path, token: token))
        )
    }

    func post<B: Encodable, T: Decodable>(
        _ path: String, payload: B, token: String? = nil
    ) async throws -> T {
        let encoded = try JSONEncoder().encode(payload)
        return try JSONDecoder().decode(
            T.self,
            from: requestData(try await request(path, method: "POST", body: encoded, token: token))
        )
    }

    func uploadAudio(_ data: Data, token: String) async throws -> AudioReply {
        guard !data.isEmpty, data.count <= Self.maxVoiceBytes else {
            throw SeslenError.invalidFile
        }
        let response = try await request(
            "/api/audio", method: "POST", body: data,
            contentType: "audio/mp4", token: token
        )
        return try JSONDecoder().decode(AudioReply.self, from: response)
    }

    private func requestData(_ data: Data) -> Data { data }
}

enum SeslenKeychain {
    private static let service = "site.serula.seslen.ios"
    private static let account = "session"

    static func read() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func save(_ token: String) throws {
        remove()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: Data(token.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else { throw SeslenError.keychain(status) }
    }

    static func remove() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }
}
