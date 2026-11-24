import AVFoundation
import SwiftUI

enum SeslenPalette {
    static let paper = Color(uiColor: .systemGroupedBackground)
    static let ink = Color.primary
    static let accent = Color(uiColor: .systemBlue)
    static let fill = Color(uiColor: .tertiarySystemFill)
    static let muted = Color.secondary
    static let border = Color(uiColor: .separator)
    static let orange = Color(uiColor: .systemOrange)
}

struct SeslenCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 24))
    }
}

struct SeslenPrimaryButton: View {
    let title: String
    let symbol: String
    var disabled = false
    let action: () -> Void

    var body: some View {
        styledButton
            .buttonBorderShape(.capsule)
            .controlSize(.large)
            .disabled(disabled)
    }

    @ViewBuilder private var styledButton: some View {
        if #available(iOS 26.0, *) {
            button.buttonStyle(.glassProminent)
        } else {
            button.buttonStyle(.borderedProminent)
        }
    }

    private var button: some View {
        Button(action: action) {
            Label(title, systemImage: symbol)
                .font(.headline)
                .frame(maxWidth: .infinity, minHeight: 32)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject private var store: SeslenStore
    @StateObject private var voice = SeslenVoiceRecorder()
    @State private var voiceMode = false
    @State private var showPairing = false
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            ZStack {
                SeslenPalette.paper.ignoresSafeArea()
                if store.signedIn {
                    dashboard
                } else {
                    welcome
                }
            }
            .navigationTitle(store.signedIn ? "Seslen" : "")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                if store.signedIn {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            showSettings = true
                        } label: {
                            Image(systemName: "gearshape")
                                .foregroundStyle(SeslenPalette.ink)
                        }
                        .accessibilityLabel("Hesap ve ayarlar")
                    }
                }
            }
            .sheet(isPresented: $showPairing) {
                PairingSheet().environmentObject(store)
            }
            .sheet(isPresented: $showSettings) {
                SettingsSheet().environmentObject(store)
            }
            .alert(
                "Seslen",
                isPresented: Binding(
                    get: { store.errorMessage != nil },
                    set: { if !$0 { store.errorMessage = nil } }
                )
            ) {
                Button("Tamam", role: .cancel) { store.errorMessage = nil }
            } message: {
                Text(store.errorMessage ?? "")
            }
            .task(id: store.signedIn) {
                guard store.signedIn else { return }
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(10))
                    if !Task.isCancelled { await store.refreshMessages() }
                }
            }
        }
        .tint(SeslenPalette.accent)
    }

    private var welcome: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                ZStack {
                    RoundedRectangle(cornerRadius: 36, style: .continuous)
                        .fill(LinearGradient(
                            colors: [.indigo.opacity(0.30), .cyan.opacity(0.18), .blue.opacity(0.06)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        ))
                    if let file = Bundle.main.url(forResource: "SeslenLogo", withExtension: "webp"),
                       let bytes = try? Data(contentsOf: file),
                       let logo = UIImage(data: bytes) {
                        Image(uiImage: logo)
                            .resizable()
                            .scaledToFit()
                            .padding(28)
                    } else {
                        Image(systemName: "tv.and.mediabox")
                            .font(.system(size: 68, weight: .medium))
                            .symbolRenderingMode(.hierarchical)
                            .foregroundStyle(.indigo)
                    }
                }
                .frame(height: 210)
                .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Seslen")
                        .font(.system(.largeTitle, design: .rounded, weight: .bold))
                        .accessibilityAddTraits(.isHeader)
                    Text("Televizyona yazılı veya sesli mesaj gönder.")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }

                SeslenPrimaryButton(
                    title: store.isBusy ? "Google bağlantısı açılıyor…" : "Google ile devam et",
                    symbol: "arrow.right",
                    disabled: store.isBusy
                ) {
                    Task { await store.signIn() }
                }
                Text("Google hesabınla giriş yapıp televizyonundaki QR kodunu bir kez okutman yeterli.")
                    .font(.footnote)
                    .foregroundStyle(SeslenPalette.muted)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    private var dashboard: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SeslenCard {
                    VStack(alignment: .leading, spacing: 14) {
                        Label("Televizyonun", systemImage: "tv")
                            .font(.headline)
                            .foregroundStyle(SeslenPalette.ink)

                        if store.devices.isEmpty {
                            Text("Henüz bağlı televizyon yok.")
                                .foregroundStyle(SeslenPalette.muted)
                            SeslenPrimaryButton(
                                title: "TV'nin QR kodunu okut",
                                symbol: "qrcode.viewfinder"
                            ) { showPairing = true }
                        } else {
                            Picker("Mesajın gideceği TV", selection: $store.selectedDeviceID) {
                                ForEach(store.devices) { device in
                                    Text(device.name).tag(device.id)
                                }
                            }
                            .pickerStyle(.menu)
                            .frame(maxWidth: .infinity, alignment: .leading)

                            Button {
                                showPairing = true
                            } label: {
                                Label("Yeni televizyon bağla", systemImage: "plus.circle")
                                    .font(.footnote.weight(.medium))
                            }
                        }
                    }
                }

                SeslenCard {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack(spacing: 10) {
                            Image(systemName: "paperplane.fill")
                                .foregroundStyle(SeslenPalette.accent)
                            Text("Televizyona gönder")
                                .font(.title3.bold())
                                .foregroundStyle(SeslenPalette.ink)
                        }

                        Picker("Mesaj türü", selection: $voiceMode) {
                            Text("Mesaj yaz").tag(false)
                            Text("Sesini gönder").tag(true)
                        }
                        .pickerStyle(.segmented)

                        if voiceMode {
                            voiceComposer
                        } else {
                            textComposer
                        }

                        Label(
                            "Mesaj TV'de 3 kez tekrarlanır. OK ile görüldü olarak işaretlenir.",
                            systemImage: "checkmark.circle"
                        )
                        .font(.caption)
                        .foregroundStyle(SeslenPalette.muted)
                    }
                }

                if !store.notice.isEmpty {
                    Label(store.notice, systemImage: "info.circle")
                        .font(.footnote)
                        .foregroundStyle(SeslenPalette.accent)
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(SeslenPalette.fill, in: RoundedRectangle(cornerRadius: 14))
                }

                SeslenCard {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Son mesajların")
                                .font(.title3.bold())
                                .foregroundStyle(SeslenPalette.ink)
                            Spacer()
                            Button {
                                Task { await store.refreshMessages() }
                            } label: {
                                Image(systemName: "arrow.clockwise")
                            }
                            .accessibilityLabel("Mesaj geçmişini yenile")
                        }
                        if store.messages.isEmpty {
                            VStack(spacing: 8) {
                                Image(systemName: "envelope.badge")
                                    .font(.system(size: 36))
                                Text("İlk ses senden gelsin.")
                                    .fontWeight(.medium)
                                Text("Gönderdiğin mesajların durumunu burada göreceksin.")
                                    .font(.footnote)
                            }
                            .foregroundStyle(SeslenPalette.muted)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 28)
                        } else {
                            ForEach(store.messages.prefix(12)) { message in
                                MessageRow(message: message)
                                if message.id != store.messages.prefix(12).last?.id {
                                    Divider()
                                }
                            }
                        }
                    }
                }

                Text("Seslen · Test sürümü")
                    .font(.caption2)
                    .foregroundStyle(SeslenPalette.muted)
                    .frame(maxWidth: .infinity)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 42)
        }
    }

    private var textComposer: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextEditor(text: $store.draft)
                .scrollContentBackground(.hidden)
                .font(.body)
                .frame(height: 150)
                .padding(12)
                .background(SeslenPalette.paper, in: RoundedRectangle(cornerRadius: 14))
                .overlay {
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(SeslenPalette.border)
                }
                .accessibilityLabel("Televizyona gönderilecek mesaj")
            HStack {
                Text("TV'de Türkçe seslendirilir.")
                Spacer()
                Text("\(store.draft.count) / 4000")
            }
            .font(.caption2)
            .foregroundStyle(SeslenPalette.muted)

            SeslenPrimaryButton(
                title: store.isBusy ? "Gönderiliyor…" : "Mesajı gönder",
                symbol: "arrow.up.right",
                disabled: !store.canSend || store.draft.count > 4000
            ) {
                Task { await store.sendText() }
            }
        }
    }

    private var voiceComposer: some View {
        VStack(spacing: 12) {
            VStack(spacing: 10) {
                Image(systemName: voice.isRecording ? "waveform" : "mic.fill")
                    .font(.system(size: 35))
                    .foregroundStyle(voice.isRecording ? SeslenPalette.orange : SeslenPalette.accent)
                    .frame(width: 68, height: 68)
                    .background(SeslenPalette.fill, in: Circle())
                Text(voice.isRecording ? "Sesin kaydediliyor…" :
                        voice.hasRecording ? "Kaydın hazır" : "Kendi sesinle seslen")
                    .font(.headline)
                    .foregroundStyle(SeslenPalette.ink)
                Text(voice.isRecording ? "\(voice.elapsed) / 60 saniye" :
                        "En fazla 60 saniye. Göndermeden önce dinleyebilirsin.")
                    .font(.caption)
                    .foregroundStyle(SeslenPalette.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(22)
            .background(SeslenPalette.paper, in: RoundedRectangle(cornerRadius: 18))

            if voice.isRecording {
                SeslenPrimaryButton(title: "Kaydı bitir", symbol: "stop.fill") {
                    voice.finish()
                }
            } else {
                SeslenPrimaryButton(
                    title: voice.hasRecording ? "Yeniden kaydet" : "Kayda başla",
                    symbol: "mic.fill",
                    disabled: store.isBusy || store.devices.isEmpty
                ) {
                    Task {
                        do { try await voice.begin() }
                        catch { store.errorMessage = error.localizedDescription }
                    }
                }
            }

            if voice.hasRecording, !voice.isRecording {
                Button {
                    do { try voice.togglePlayback() }
                    catch { store.errorMessage = error.localizedDescription }
                } label: {
                    Label(voice.isPlaying ? "Dinlemeyi durdur" : "Kaydı dinle",
                          systemImage: voice.isPlaying ? "stop.circle" : "play.circle")
                        .frame(maxWidth: .infinity, minHeight: 42)
                }

                SeslenPrimaryButton(
                    title: store.isBusy ? "Gönderiliyor…" : "Ses kaydını gönder",
                    symbol: "arrow.up.right",
                    disabled: store.isBusy || store.selectedDeviceID.isEmpty
                ) {
                    guard let file = voice.fileURL else { return }
                    Task {
                        if await store.sendVoice(fileURL: file) {
                            voice.reset()
                        }
                    }
                }
            }
        }
    }
}

struct MessageRow: View {
    let message: TVMessage

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(message.text.isEmpty ? "Sesli mesaj" : message.text)
                .font(.subheadline)
                .foregroundStyle(SeslenPalette.ink)
            HStack {
                Text(message.createdDate, format: .dateTime.day().month(.abbreviated).hour().minute())
                    .font(.caption2)
                    .foregroundStyle(SeslenPalette.muted)
                Spacer()
                Text(message.statusTitle)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(message.status == "failed" ? .red : SeslenPalette.accent)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        message.status == "failed" ? Color.red.opacity(0.08) : SeslenPalette.fill,
                        in: Capsule()
                    )
            }
        }
        .padding(.vertical, 6)
    }
}

struct PairingSheet: View {
    @EnvironmentObject private var store: SeslenStore
    @Environment(\.dismiss) private var dismiss
    @State private var code = ""
    @State private var name = "Salon TV"
    @State private var scanning = false

    var body: some View {
        NavigationStack {
            Form {
                Section("QR ile bağlan") {
                    Text("TV'de Seslen'i açıp Google hesabıyla bağlan'a bas. Ekrandaki QR kodunu iPhone kameranla okut.")
                    Button {
                        Task {
                            let allowed = await AVCaptureDevice.requestAccess(for: .video)
                            if allowed {
                                scanning = true
                            } else {
                                store.errorMessage = "iPhone Ayarları'ndan Seslen için kamera izni ver."
                            }
                        }
                    } label: {
                        Label("QR kodunu okut", systemImage: "qrcode.viewfinder")
                    }
                }

                Section("Kodla bağlan") {
                    TextField("12 karakterlik TV kodu", text: $code)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                    TextField("Televizyon adı", text: $name)
                }

                Section {
                    SeslenPrimaryButton(
                        title: "Bu televizyonu hesabıma bağla",
                        symbol: "checkmark.circle",
                        disabled: store.isBusy
                    ) {
                        Task {
                            if await store.pairTV(code: code, name: name) {
                                dismiss()
                            }
                        }
                    }
                } footer: {
                    Text("Yalnızca kendi televizyonunun QR kodunu onayla.")
                }
            }
            .navigationTitle("Televizyon bağla")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Kapat") { dismiss() }
                }
            }
            .sheet(isPresented: $scanning) {
                NavigationStack {
                    SeslenQRScanner { value in
                        code = value
                        scanning = false
                    }
                    .ignoresSafeArea(edges: .bottom)
                    .navigationTitle("TV QR kodunu okut")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Kapat") { scanning = false }
                        }
                    }
                }
            }
        }
    }
}

struct SettingsSheet: View {
    @EnvironmentObject private var store: SeslenStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Google hesabın") {
                    Text(store.accountEmail)
                    Text("Oturum iPhone Keychain'de güvenle saklanır.")
                        .font(.footnote)
                        .foregroundStyle(SeslenPalette.muted)
                }
                Section("Mesaj durumu") {
                    Text("Mesajların görüldü durumunu uygulama açıkken takip edebilirsin.")
                    Link("Seslen’i Safari’de aç", destination: URL(string: SeslenAPI.origin)!)
                    Text("Uygulama kapalıyken bildirim almak için Safari’de Paylaş → Ana Ekrana Ekle’yi seç. Ana ekrandan Seslen’i aç, aynı Google hesabıyla giriş yap ve ayarlardan Görüldü bildirimlerini aç.")
                        .font(.footnote)
                        .foregroundStyle(SeslenPalette.muted)
                }
                Section {
                    Button("Google oturumundan çık", role: .destructive) {
                        Task {
                            await store.signOut()
                            dismiss()
                        }
                    }
                }
            }
            .navigationTitle("Hesap ve ayarlar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Bitti") { dismiss() }
                }
            }
        }
    }
}
