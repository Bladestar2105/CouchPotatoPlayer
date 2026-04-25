import AppKit
import CoreGraphics
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let sourceURL = root.appendingPathComponent("assets/store/tvos/app-icon-large-1280x768.png")
let outputDir = root.appendingPathComponent("assets/store/tvos")

let targets: [(String, Int, Int)] = [
    ("top-shelf-1920x720.png", 1920, 720),
    ("top-shelf2x-3840x1440.png", 3840, 1440),
    ("top-shelf-wide-2320x720.png", 2320, 720),
    ("top-shelf-wide2x-4640x1440.png", 4640, 1440),
]

let background = NSColor(calibratedRed: 228.0 / 255.0, green: 228.0 / 255.0, blue: 231.0 / 255.0, alpha: 1)
let bytesPerPixel = 4

func makeRGBAContext(width: Int, height: Int, buffer: inout [UInt8], opaque: Bool = false) -> CGContext {
    let bytesPerRow = width * bytesPerPixel
    guard let context = CGContext(
        data: &buffer,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: (opaque ? CGImageAlphaInfo.noneSkipLast : CGImageAlphaInfo.premultipliedLast).rawValue
    ) else {
        fatalError("Could not create RGBA context")
    }
    return context
}

guard let image = NSImage(contentsOf: sourceURL),
      let source = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fatalError("Could not load source image: \(sourceURL.path)")
}

let sourceWidth = source.width
let sourceHeight = source.height
let sourceBytesPerRow = sourceWidth * bytesPerPixel
var sourcePixels = [UInt8](repeating: 0, count: sourceHeight * sourceBytesPerRow)
var sourceContext = makeRGBAContext(width: sourceWidth, height: sourceHeight, buffer: &sourcePixels)
sourceContext.clear(CGRect(x: 0, y: 0, width: sourceWidth, height: sourceHeight))
sourceContext.draw(source, in: CGRect(x: 0, y: 0, width: sourceWidth, height: sourceHeight))

guard let provider = CGDataProvider(data: NSData(bytes: sourcePixels, length: sourcePixels.count)),
      let transparentSource = CGImage(
        width: sourceWidth,
        height: sourceHeight,
        bitsPerComponent: 8,
        bitsPerPixel: 32,
        bytesPerRow: sourceBytesPerRow,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
        provider: provider,
        decode: nil,
        shouldInterpolate: true,
        intent: .defaultIntent
      ) else {
    fatalError("Could not create top-shelf source")
}

try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

for (name, targetWidth, targetHeight) in targets {
    let targetBytesPerRow = targetWidth * bytesPerPixel
    var outputPixels = [UInt8](repeating: 255, count: targetHeight * targetBytesPerRow)
    for index in stride(from: 0, to: outputPixels.count, by: 4) {
        outputPixels[index + 3] = 255
    }

    let outputContext = makeRGBAContext(width: targetWidth, height: targetHeight, buffer: &outputPixels, opaque: true)
    outputContext.interpolationQuality = .high
    outputContext.setFillColor(background.cgColor)
    outputContext.fill(CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))

    let maxHeight = CGFloat(targetHeight) * 0.78
    let maxWidth = CGFloat(targetWidth) * 0.48
    let scale = min(maxWidth / CGFloat(transparentSource.width), maxHeight / CGFloat(transparentSource.height))
    let drawWidth = CGFloat(transparentSource.width) * scale
    let drawHeight = CGFloat(transparentSource.height) * scale
    let leftInset = CGFloat(targetWidth) * 0.08
    let drawRect = CGRect(
        x: leftInset,
        y: (CGFloat(targetHeight) - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight
    )
    outputContext.draw(transparentSource, in: drawRect)

    guard let outputImage = outputContext.makeImage(),
          let pngData = NSBitmapImageRep(cgImage: outputImage).representation(using: .png, properties: [:]) else {
        fatalError("Could not encode \(name)")
    }
    try pngData.write(to: outputDir.appendingPathComponent(name))
    print("Wrote \(name) \(targetWidth)x\(targetHeight)")
}
