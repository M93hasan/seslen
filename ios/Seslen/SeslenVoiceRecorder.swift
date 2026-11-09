import AVFoundation
import Foundation

@MainActor
final class SeslenVoiceRecorder: NSObject, ObservableObject, AVAudioPlayerDelegate {
    @Published private(set) var isRecording = false
    @Published private(set) var hasRecording = false
    @Published private(set) var isPlaying = false
    @Published private(set) var elapsed = 0

    private var recorder: AVAudioRecorder?
    private var player: AVAudioPlayer?
    private var timer: Timer?

    private(set) var fileURL: URL?

    func begin() async throws {
        guard await AVAudioApplication.requestRecordPermission() else {
            throw SeslenError.server("Ses kaydı için iPhone Ayarları'ndan mikrofon izni ver.")
        }
        reset()
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(
            .playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth]
        )
        try audioSession.setActive(true)

        let file = FileManager.default.temporaryDirectory
            .appendingPathComponent("seslen-" + UUID().uuidString)
            .appendingPathExtension("m4a")
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 22_050,
            AVNumberOfChannelsKey: 1,
            AVEncoderBitRateKey: 48_000
        ]
        let recorder = try AVAudioRecorder(url: file, settings: settings)
        guard recorder.prepareToRecord(), recorder.record(forDuration: 60) else {
            throw SeslenError.server("Mikrofon kaydı başlatılamadı.")
        }
        self.recorder = recorder
        self.fileURL = file
        isRecording = true
        elapsed = 0
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, self.isRecording else { return }
                self.elapsed += 1
                if self.elapsed >= 60 { self.finish() }
            }
        }
    }

    func finish() {
        guard isRecording else { return }
        recorder?.stop()
        timer?.invalidate()
        timer = nil
        recorder = nil
        isRecording = false
        if let fileURL,
           let size = try? FileManager.default.attributesOfItem(atPath: fileURL.path)[.size] as? NSNumber {
            hasRecording = size.intValue > 0 && size.intValue <= SeslenAPI.maxVoiceBytes
        } else {
            hasRecording = false
        }
    }

    func togglePlayback() throws {
        if isPlaying {
            player?.stop()
            isPlaying = false
            return
        }
        guard hasRecording, let fileURL else {
            throw SeslenError.server("Önce bir ses kaydı oluştur.")
        }
        try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        let player = try AVAudioPlayer(contentsOf: fileURL)
        player.delegate = self
        self.player = player
        isPlaying = player.play()
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor [weak self] in self?.isPlaying = false }
    }

    func reset() {
        timer?.invalidate()
        timer = nil
        recorder?.stop()
        recorder = nil
        player?.stop()
        player = nil
        isRecording = false
        isPlaying = false
        elapsed = 0
        hasRecording = false
        if let fileURL { try? FileManager.default.removeItem(at: fileURL) }
        fileURL = nil
    }
}
