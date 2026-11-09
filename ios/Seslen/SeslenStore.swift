import Foundation
import SwiftUI

@MainActor
final class SeslenStore: ObservableObject {
    @Published private(set) var token: String? = SeslenKeychain.read()
    @Published private(set) var accountEmail = ""
    @Published private(set) var devices: [TVDevice] = []
    @Published private(set) var messages: [TVMessage] = []
    @Published var selectedDeviceID = ""
    @Published var draft = ""
    @Published var isBusy = false
    @Published var notice = "Bir ses kadar yakın."
    @Published var errorMessage: String?

    private let api = SeslenAPI()
    private let loginCoordinator = WebLoginCoordinator()

    var signedIn: Bool { token != nil }
    var canSend: Bool {
        signedIn && !isBusy && !selectedDeviceID.isEmpty &&
            !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    func restore() async {
        guard token != nil else { return }
        await reload()
    }

    func signIn() async {
        guard !isBusy else { return }
        isBusy = true
        defer { isBusy = false }
        do {
            let value = try await loginCoordinator.signIn()
            token = value
            await reload()
            notice = "Google hesabınla giriş yapıldı."
        } catch {
            let nsError = error as NSError
            if nsError.domain == "com.apple.AuthenticationServices.WebAuthenticationSession" &&
                nsError.code == 1 {
                return // User dismissed the sign-in dialog.
            }
            errorMessage = error.localizedDescription
        }
    }

    func reload() async {
        guard let token else { return }
        do {
            async let accountReply: AccountReply = api.get("/api/account", token: token)
            async let devicesReply: DevicesReply = api.get("/api/devices", token: token)
            async let messagesReply: MessagesReply = api.get("/api/messages", token: token)
            let (account, resultDevices, resultMessages) = try await (
                accountReply, devicesReply, messagesReply
            )
            accountEmail = account.email
            devices = resultDevices.devices
            messages = resultMessages.messages
            if !devices.contains(where: { $0.id == selectedDeviceID }) {
                selectedDeviceID = devices.first?.id ?? ""
            }
            notice = devices.isEmpty
                ? "TV'de Seslen'i açıp QR kodunu okut."
                : "Bağlantı hazır. Sevdiklerine seslenebilirsin."
        } catch SeslenError.unauthorized {
            clearSession()
            errorMessage = SeslenError.unauthorized.localizedDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refreshMessages() async {
        guard let token else { return }
        do {
            let result: MessagesReply = try await api.get("/api/messages", token: token)
            messages = result.messages
        } catch SeslenError.unauthorized {
            clearSession()
            notice = "Oturumun sona erdi. Tekrar giriş yap."
        } catch {
            // Intermittent connectivity should not block editing a draft.
        }
    }

    func sendText() async {
        guard let token, canSend else { return }
        isBusy = true
        defer { isBusy = false }
        let payload = MessagePayload(
            device: selectedDeviceID,
            text: draft.trimmingCharacters(in: .whitespacesAndNewlines),
            audio: "",
            key: UUID().uuidString
        )
        do {
            let _: MessageReply = try await api.post(
                "/api/messages", payload: payload, token: token
            )
            draft = ""
            notice = "Mesaj gönderildi. Televizyona ulaşması bekleniyor."
            await refreshMessages()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sendVoice(fileURL: URL) async {
        guard let token, !selectedDeviceID.isEmpty, !isBusy else { return }
        isBusy = true
        defer { isBusy = false }
        do {
            let bytes = try Data(contentsOf: fileURL)
            let uploaded = try await api.uploadAudio(bytes, token: token)
            let payload = MessagePayload(
                device: selectedDeviceID, text: "",
                audio: uploaded.audio, key: UUID().uuidString
            )
            let _: MessageReply = try await api.post(
                "/api/messages", payload: payload, token: token
            )
            notice = "Sesli mesaj gönderildi. Televizyona ulaşması bekleniyor."
            await refreshMessages()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func pairTV(code: String, name: String = "Salon TV") async -> Bool {
        guard let token else { return false }
        let normalized = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard normalized.range(of: "^[A-F0-9]{12}$", options: .regularExpression) != nil else {
            errorMessage = "TV kodu 12 karakter olmalı. QR kodunu tekrar okut."
            return false
        }
        isBusy = true
        defer { isBusy = false }
        do {
            let _: PairReply = try await api.post(
                "/api/pair/confirm", payload: PairPayload(
                    code: normalized, name: name.isEmpty ? "Salon TV" : name
                ), token: token
            )
            await reload()
            notice = "Televizyon Google hesabına bağlandı."
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func signOut() async {
        if let token {
            let _: AcknowledgeReply? = try? await api.post(
                "/api/logout", payload: EmptyPayload(), token: token
            )
        }
        clearSession()
        notice = "Oturum kapatıldı."
    }

    private func clearSession() {
        SeslenKeychain.remove()
        token = nil
        accountEmail = ""
        devices = []
        messages = []
        selectedDeviceID = ""
    }
}
