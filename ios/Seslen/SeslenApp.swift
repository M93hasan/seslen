import SwiftUI

@main
struct SeslenApp: App {
    @StateObject private var store = SeslenStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .task { await store.restore() }
        }
    }
}
