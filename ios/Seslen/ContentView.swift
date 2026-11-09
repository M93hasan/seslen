import AVFoundation
import SwiftUI

enum SeslenPalette {
    static let paper = Color(red: 0.963, green: 0.970, blue: 0.951)
    static let ink = Color(red: 0.095, green: 0.230, blue: 0.208)
    static let green = Color(red: 0.123, green: 0.335, blue: 0.272)
    static let mint = Color(red: 0.850, green: 0.930, blue: 0.875)
    static let muted = Color(red: 0.407, green: 0.480, blue: 0.433)
    static let border = Color(red: 0.862, green: 0.901, blue: 0.856)
    static let orange = Color(red: 0.864, green: 0.485, blue: 0.324)
}

struct SeslenCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 24))
            .overlay {
                RoundedRectangle(cornerRadius: 24)
                    .stroke(SeslenPalette.border.opacity(0.8), lineWidth: 1)
            }
    }
}

struct SeslenPrimaryButton: View {
    let title: String
    let symbol: String
    var disabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Text(title).fontWeight(.semibold)
                Spacer(minLength: 0)
                Image(systemName: symbol)
            }
            .font(.system(size: 16))
            .padding(.horizontal, 20)
            .frame(height: 56)
            .foregroundStyle(.white)
            .background(
                disabled ? SeslenPalette.muted : SeslenPalette.green,
                in: RoundedRectangle(cornerRadius: 16)
            )
        }
        .buttonStyle(.plain)
        .disabled(disabled)
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
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 4) {
                        Image(systemName: "waveform")
                            .foregroundStyle(SeslenPalette.orange)
                        Text("seslen.")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundStyle(SeslenPalette.ink)
                    }
                }
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
            .toolbarBackground(SeslenPalette.paper, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
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
        .tint(SeslenPalette.green)
    }

    private var welcome: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Spacer(minLength: 30)
                ZStack {
                    RoundedRectangle(cornerRadius: 42)
                        .fill(SeslenPalette.mint)
                        .frame(height: 220)
                    VStack(spacing: 14) {
                        Image(systemName: "tv.and.mediabox")
                            .font(.system(size: 66, weight: .thin))
                            .foregroundStyle(SeslenPalette.green)
                        Image(systemName: "waveform")
                            .font(.system(size: 30, weight: .medium))
                            .foregroundStyle(SeslenPalette.orange)
                    }
                }
                Text("BİR SES KADAR YAKIN")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(2.5)
                    .foregroundStyle(SeslenPalette.green)
                Text("Telefonu duymadıysa,\ntelevizyona seslen.")
                    .font(.system(size: 35, weight: .bold, design: .rounded))
                    .tracking(-1.2)
                    .foregroundStyle(SeslenPalette.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Sevdiklerine yazılı veya kendi sesinle mesaj gönder. Philips Android TV'de görünsün, üç kez seslendirilsin.")
                    .font(.system(size: 16))
                    .foregroundStyle(SeslenPalette.muted)
                    .lineSpacing(5)

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
                VStack(alignment: .leading, spacing: 8) {
                    Text("EVİNE BİR SES GÖNDER")
                        .font(.system(size: 11, weight: .heavy))
                        .tracking(2.4)
                        .foregroundStyle(SeslenPalette.green)
                    Text("Ne söylemek istersin?")
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundStyle(SeslenPalette.ink)
                    Text(store.accountEmail)
                        .font(.caption)
                        .foregroundStyle(SeslenPalette.muted)
                }
                .padding(.top, 18)

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
                                .foregroundStyle(SeslenPalette.green)
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
                        .foregroundStyle(SeslenPalette.green)
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(SeslenPalette.mint, in: RoundedRectangle(cornerRadius: 14))
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

                Text("Seslen · iPhone uygulaması · Test sürümü")
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

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    quickNote("Yemek hazır", value: "Yemek hazır, seni bekliyoruz.")
                    quickNote("Telefonuna bak", value: "Telefonuna bakabilir misin?")
                    quickNote("Seni seviyorum", value: "Seni seviyorum.")
                }
            }

            SeslenPrimaryButton(
                title: store.isBusy ? "Gönderiliyor…" : "Mesajı gönder",
                symbol: "arrow.up.right",
                disabled: !store.canSend || store.draft.count > 4000
            ) {
                Task { await store.sendText() }
            }
        }
    }

    private func quickNote(_ label: String, value: String) -> some View {
        Button {
            store.draft = value
        } label: {
            Text(label)
                .font(.footnote.weight(.medium))
                .padding(.horizontal, 13)
                .padding(.vertical, 10)
                .background(SeslenPalette.paper, in: Capsule())
                .overlay(Capsule().stroke(SeslenPalette.border))
        }
        .buttonStyle(.plain)
    }

    private var voiceComposer: some View {
        VStack(spacing: 12) {
            VStack(spacing: 10) {
                Image(systemName: voice.isRecording ? "waveform" : "mic.fill")
                    .font(.system(size: 35))
                    .foregroundStyle(voice.isRecording ? SeslenPalette.orange : SeslenPalette.green)
                    .frame(width: 68, height: 68)
                    .background(SeslenPalette.mint, in: Circle())
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
                    .foregroundStyle(message.status == "failed" ? .red : SeslenPalette.green)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        message.status == "failed" ? Color.red.opacity(0.08) : SeslenPalette.mint,
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
                    Text("Bildirimler için Apple APNs kurulumu ayrı onay gerektirir.")
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
