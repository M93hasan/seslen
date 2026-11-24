import AVFoundation
import SwiftUI
import UIKit

enum SeslenPairCode {
    static func extract(_ raw: String) -> String? {
        let direct = raw.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if direct.range(of: "^[A-F0-9]{12}$", options: .regularExpression) != nil {
            return direct
        }
        guard let components = URLComponents(string: raw),
              components.scheme == "https",
              let host = components.host?.lowercased(),
              ["seslen.serula.site", "seslen-staging.m93hasan.workers.dev"].contains(host),
              let code = components.queryItems?.first(where: { $0.name == "pair" })?.value?
                .uppercased(),
              code.range(of: "^[A-F0-9]{12}$", options: .regularExpression) != nil else {
            return nil
        }
        return code
    }
}

struct SeslenQRScanner: UIViewControllerRepresentable {
    let onCode: (String) -> Void

    func makeUIViewController(context: Context) -> QRScannerController {
        let controller = QRScannerController()
        controller.onCode = onCode
        return controller
    }

    func updateUIViewController(_ controller: QRScannerController, context: Context) {}
}

final class QRScannerController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onCode: ((String) -> Void)?

    private let capture = AVCaptureSession()
    private var layer: AVCaptureVideoPreviewLayer?
    private var didRead = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        guard let camera = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: camera),
              capture.canAddInput(input) else { return }
        capture.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard capture.canAddOutput(output) else { return }
        capture.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]

        let preview = AVCaptureVideoPreviewLayer(session: capture)
        preview.videoGravity = .resizeAspectFill
        view.layer.addSublayer(preview)
        layer = preview
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        layer?.frame = view.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        let capture = capture
        DispatchQueue.global(qos: .userInitiated).async {
            if !capture.isRunning { capture.startRunning() }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        let capture = capture
        DispatchQueue.global(qos: .userInitiated).async {
            if capture.isRunning { capture.stopRunning() }
        }
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard !didRead else { return }
        for object in metadataObjects {
            guard let code = (object as? AVMetadataMachineReadableCodeObject)?.stringValue,
                  let valid = SeslenPairCode.extract(code) else { continue }
            didRead = true
            onCode?(valid)
            return
        }
    }
}
