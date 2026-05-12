import AppKit
import CoreGraphics
import Foundation

let width = 1920
let height = 1080
let outputWidth = 1280
let outputHeight = 720
let fps: Int32 = 10
let outputURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
  .appendingPathComponent("video")
  .appendingPathComponent("sportzlabs-walkthrough.avi")

struct Scene {
  let title: String
  let subtitle: String
  let bullets: [String]
  let duration: Double
  let mode: String
}

let scenes = [
  Scene(
    title: "SportzLabs Performance Lab",
    subtitle: "AFL team, player, PAV and news analytics",
    bullets: ["Track team momentum", "Spot improvers and watchlists", "Compare players across rounds"],
    duration: 4,
    mode: "hero"
  ),
  Scene(
    title: "Team Dashboard",
    subtitle: "Start with team, stat and comparison filters",
    bullets: ["Choose a team", "Pick a statistic", "Compare recent form against earlier games"],
    duration: 5,
    mode: "dashboard"
  ),
  Scene(
    title: "Read the Signals",
    subtitle: "Green highlights improving form. Red highlights risk.",
    bullets: ["Team direction", "Improvers", "Watchlist", "Team stat rank"],
    duration: 5,
    mode: "signals"
  ),
  Scene(
    title: "Inspect Player Detail",
    subtitle: "Click a player to see round-by-round movement",
    bullets: ["Selected stat chart", "PAV by round", "Trend and signal in the stat table"],
    duration: 5,
    mode: "player"
  ),
  Scene(
    title: "Compare Players",
    subtitle: "Select players from any team and compare the same stat",
    bullets: ["Filter by team or position", "Select two or more players", "Change the statistic any time"],
    duration: 5,
    mode: "compare"
  ),
  Scene(
    title: "Newsfeed",
    subtitle: "Reputable AFL news in the same app",
    bullets: ["Filter by team", "Search headlines", "Tap a story to open the article"],
    duration: 4,
    mode: "news"
  ),
  Scene(
    title: "Install as an App",
    subtitle: "Use it from the home screen on mobile",
    bullets: ["iPhone: Safari > Share > Add to Home Screen", "Android: Chrome > Install app", "App Store packaging is ready with Capacitor"],
    duration: 5,
    mode: "install"
  ),
]

func color(_ hex: String, alpha: CGFloat = 1) -> NSColor {
  var value = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
  if value.count == 3 {
    value = value.map { "\($0)\($0)" }.joined()
  }
  var int: UInt64 = 0
  Scanner(string: value).scanHexInt64(&int)
  return NSColor(
    calibratedRed: CGFloat((int >> 16) & 255) / 255,
    green: CGFloat((int >> 8) & 255) / 255,
    blue: CGFloat(int & 255) / 255,
    alpha: alpha
  )
}

func drawText(_ text: String, x: CGFloat, y: CGFloat, width: CGFloat, size: CGFloat, weight: NSFont.Weight = .regular, color textColor: NSColor = color("#f6f8fc"), align: NSTextAlignment = .left) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = align
  paragraph.lineSpacing = size * 0.16
  let attrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: size, weight: weight),
    .foregroundColor: textColor,
    .paragraphStyle: paragraph,
  ]
  NSString(string: text).draw(
    with: CGRect(x: x, y: y, width: width, height: 400),
    options: [.usesLineFragmentOrigin, .usesFontLeading],
    attributes: attrs
  )
}

func roundedRect(_ rect: CGRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, lineWidth: CGFloat = 2) {
  let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
  fill.setFill()
  path.fill()
  if let stroke {
    stroke.setStroke()
    path.lineWidth = lineWidth
    path.stroke()
  }
}

func drawBackground() {
  color("#07101f").setFill()
  NSRect(x: 0, y: 0, width: width, height: height).fill()
  color("#13254a", alpha: 0.9).setFill()
  NSBezierPath(ovalIn: CGRect(x: 1220, y: -230, width: 820, height: 820)).fill()
  color("#e51b23", alpha: 0.22).setFill()
  NSBezierPath(ovalIn: CGRect(x: -180, y: -150, width: 720, height: 720)).fill()
}

func drawAppChrome(active: String) {
  roundedRect(CGRect(x: 90, y: 76, width: 1740, height: 900), radius: 20, fill: color("#0c1830", alpha: 0.96), stroke: color("#aeb9c1", alpha: 0.18), lineWidth: 2)
  drawText("SEASON ANALYTICS", x: 130, y: 120, width: 500, size: 26, weight: .heavy, color: color("#ff4d55"))
  drawText("Performance Lab", x: 130, y: 156, width: 800, size: 62, weight: .heavy)
  let tabs = ["Team dashboard", "Player comparison", "Newsfeed"]
  for (index, tab) in tabs.enumerated() {
    let rect = CGRect(x: 130 + CGFloat(index) * 255, y: 250, width: 230, height: 58)
    let isActive = tab.lowercased().contains(active)
    roundedRect(rect, radius: 10, fill: isActive ? color("#e51b23", alpha: 0.3) : color("#111f3d"), stroke: isActive ? color("#e51b23") : color("#aeb9c1", alpha: 0.25), lineWidth: 2)
    drawText(tab, x: rect.minX + 12, y: rect.minY + 16, width: rect.width - 24, size: 20, weight: .bold, align: .center)
  }
}

func drawLineChart(_ rect: CGRect, accent: NSColor) {
  roundedRect(rect, radius: 14, fill: color("#07101f", alpha: 0.5), stroke: color("#aeb9c1", alpha: 0.15))
  for i in 0..<5 {
    let y = rect.minY + 50 + CGFloat(i) * ((rect.height - 90) / 4)
    color("#aeb9c1", alpha: 0.13).setStroke()
    let path = NSBezierPath()
    path.move(to: CGPoint(x: rect.minX + 50, y: y))
    path.line(to: CGPoint(x: rect.maxX - 40, y: y))
    path.stroke()
  }
  let points = [0.45, 0.52, 0.40, 0.68, 0.55, 0.76, 0.64]
  let path = NSBezierPath()
  for (index, value) in points.enumerated() {
    let x = rect.minX + 65 + CGFloat(index) * ((rect.width - 130) / CGFloat(points.count - 1))
    let y = rect.maxY - 70 - CGFloat(value) * (rect.height - 130)
    if index == 0 { path.move(to: CGPoint(x: x, y: y)) } else { path.line(to: CGPoint(x: x, y: y)) }
    accent.setFill()
    NSBezierPath(ovalIn: CGRect(x: x - 6, y: y - 6, width: 12, height: 12)).fill()
  }
  accent.setStroke()
  path.lineWidth = 5
  path.stroke()
}

func drawPills(_ labels: [String], x: CGFloat, y: CGFloat) {
  for (index, label) in labels.enumerated() {
    let rect = CGRect(x: x, y: y + CGFloat(index) * 72, width: 470, height: 52)
    roundedRect(rect, radius: 12, fill: color("#111f3d"), stroke: color("#aeb9c1", alpha: 0.18))
    drawText(label, x: rect.minX + 18, y: rect.minY + 14, width: rect.width - 110, size: 19, weight: .bold)
    roundedRect(CGRect(x: rect.maxX - 90, y: rect.minY + 13, width: 70, height: 26), radius: 13, fill: index < 2 ? color("#12b886") : color("#e51b23"))
    drawText(index < 2 ? "+4.2" : "-2.1", x: rect.maxX - 86, y: rect.minY + 17, width: 62, size: 14, weight: .bold, align: .center)
  }
}

func drawScene(_ scene: Scene, progress: Double) {
  drawBackground()
  drawText(scene.title, x: 90, y: 760, width: 820, size: 64, weight: .heavy)
  drawText(scene.subtitle, x: 94, y: 845, width: 850, size: 30, weight: .semibold, color: color("#aeb9c1"))
  for (index, bullet) in scene.bullets.enumerated() {
    let y = 905 + CGFloat(index) * 42
    color(index == 0 ? "#12b886" : "#e51b23").setFill()
    NSBezierPath(ovalIn: CGRect(x: 98, y: y + 7, width: 12, height: 12)).fill()
    drawText(bullet, x: 126, y: y, width: 760, size: 24, weight: .medium, color: color("#f6f8fc", alpha: 0.92))
  }

  switch scene.mode {
  case "hero":
    roundedRect(CGRect(x: 1060, y: 225, width: 520, height: 520), radius: 96, fill: color("#13254a"), stroke: color("#aeb9c1", alpha: 0.16))
    drawText("SL", x: 1135, y: 380, width: 370, size: 180, weight: .heavy, align: .center)
    color("#e51b23").setFill()
    NSRect(x: 1060, y: 225, width: 520, height: 92).fill()
    drawText("SPORTZLABS", x: 1112, y: 640, width: 420, size: 34, weight: .heavy, color: color("#12b886"), align: .center)
  case "dashboard":
    drawAppChrome(active: "team")
    roundedRect(CGRect(x: 130, y: 340, width: 520, height: 250), radius: 14, fill: color("#111f3d"), stroke: color("#aeb9c1", alpha: 0.2))
    ["Team  Collingwood", "Stat  Disposals", "Compare  Last three games"].enumerated().forEach { index, text in
      roundedRect(CGRect(x: 165, y: 372 + CGFloat(index) * 68, width: 450, height: 42), radius: 8, fill: color("#07101f"), stroke: color("#aeb9c1", alpha: 0.2))
      drawText(text, x: 184, y: 382 + CGFloat(index) * 68, width: 410, size: 20, weight: .bold)
    }
    drawLineChart(CGRect(x: 760, y: 340, width: 910, height: 410), accent: color("#12b886"))
  case "signals":
    drawAppChrome(active: "team")
    let cards = [("Team direction", "Up", "#12b886"), ("Improvers", "8", "#12b886"), ("Watchlist", "3", "#e51b23"), ("Team rank", "Top 20%", "#12b886")]
    for (index, card) in cards.enumerated() {
      let rect = CGRect(x: 130 + CGFloat(index) * 410, y: 350, width: 360, height: 170)
      roundedRect(rect, radius: 14, fill: color("#111f3d"), stroke: color(card.2), lineWidth: 4)
      drawText(card.0, x: rect.minX + 24, y: rect.minY + 28, width: 300, size: 22, weight: .bold, color: color("#aeb9c1"))
      drawText(card.1, x: rect.minX + 24, y: rect.minY + 74, width: 300, size: 54, weight: .heavy, color: color(card.2))
    }
    drawPills(["Nick Daicos", "Scott Pendlebury", "Jordan De Goey"], x: 130, y: 575)
  case "player":
    drawAppChrome(active: "team")
    drawLineChart(CGRect(x: 130, y: 350, width: 760, height: 390), accent: color("#12b886"))
    drawLineChart(CGRect(x: 950, y: 350, width: 720, height: 390), accent: color("#e51b23"))
    drawText("Selected stat by round", x: 150, y: 760, width: 500, size: 24, weight: .bold)
    drawText("PAV by round", x: 970, y: 760, width: 500, size: 24, weight: .bold)
  case "compare":
    drawAppChrome(active: "player")
    roundedRect(CGRect(x: 130, y: 340, width: 430, height: 420), radius: 14, fill: color("#111f3d"), stroke: color("#aeb9c1", alpha: 0.2))
    drawText("Filters", x: 165, y: 372, width: 320, size: 28, weight: .heavy)
    ["Team: All teams", "Position: Midfield", "Improving only"].enumerated().forEach { index, text in
      drawText(text, x: 165, y: 430 + CGFloat(index) * 58, width: 330, size: 23, weight: .bold, color: color("#aeb9c1"))
    }
    drawLineChart(CGRect(x: 620, y: 340, width: 1040, height: 420), accent: color("#12b886"))
    drawLineChart(CGRect(x: 620, y: 340, width: 1040, height: 420), accent: color("#315da8"))
  case "news":
    drawAppChrome(active: "news")
    for index in 0..<3 {
      let rect = CGRect(x: 140 + CGFloat(index) * 515, y: 350, width: 470, height: 390)
      roundedRect(rect, radius: 14, fill: color("#111f3d"), stroke: color("#aeb9c1", alpha: 0.18))
      roundedRect(CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: 150), radius: 14, fill: color("#13254a"))
      drawText(["AFL.com.au", "ABC Sport", "The Guardian"][index], x: rect.minX + 20, y: rect.minY + 180, width: 220, size: 18, weight: .heavy, color: color("#ff4d55"))
      drawText(["Match preview and selection news", "Injury update for key players", "Club form story and analysis"][index], x: rect.minX + 20, y: rect.minY + 220, width: 410, size: 28, weight: .heavy)
      drawText("Read article", x: rect.minX + 20, y: rect.minY + 330, width: 180, size: 22, weight: .bold, color: color("#12b886"))
    }
  default:
    drawAppChrome(active: "team")
    roundedRect(CGRect(x: 1070, y: 280, width: 460, height: 460), radius: 84, fill: color("#111f3d"), stroke: color("#12b886"), lineWidth: 5)
    drawText("Add to\nHome Screen", x: 1130, y: 410, width: 340, size: 56, weight: .heavy, align: .center)
  }

  let barWidth = CGFloat(progress) * 1740
  roundedRect(CGRect(x: 90, y: 1015, width: 1740, height: 12), radius: 6, fill: color("#aeb9c1", alpha: 0.14))
  roundedRect(CGRect(x: 90, y: 1015, width: barWidth, height: 12), radius: 6, fill: color("#e51b23"))
}

func le16(_ value: UInt16) -> Data {
  var little = value.littleEndian
  return Data(bytes: &little, count: 2)
}

func le32(_ value: UInt32) -> Data {
  var little = value.littleEndian
  return Data(bytes: &little, count: 4)
}

func fourCC(_ value: String) -> Data {
  Data(value.utf8)
}

func chunk(_ id: String, _ payload: Data) -> Data {
  var data = Data()
  data.append(fourCC(id))
  data.append(le32(UInt32(payload.count)))
  data.append(payload)
  if payload.count % 2 == 1 { data.append(0) }
  return data
}

func list(_ type: String, _ payload: Data) -> Data {
  var data = Data()
  data.append(fourCC("LIST"))
  data.append(le32(UInt32(payload.count + 4)))
  data.append(fourCC(type))
  data.append(payload)
  if payload.count % 2 == 1 { data.append(0) }
  return data
}

func renderJPEG(scene: Scene, progress: Double) -> Data {
  let image = NSImage(size: NSSize(width: outputWidth, height: outputHeight))
  image.lockFocus()
  NSGraphicsContext.current?.imageInterpolation = .high
  let transform = NSAffineTransform()
  transform.scaleX(by: CGFloat(outputWidth) / CGFloat(width), yBy: CGFloat(outputHeight) / CGFloat(height))
  transform.concat()
  drawScene(scene, progress: progress)
  image.unlockFocus()
  guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return Data() }
  let bitmap = NSBitmapImageRep(cgImage: cgImage)
  return bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.78]) ?? Data()
}

func makeAvi(frames: [Data]) -> Data {
  let totalFrames = UInt32(frames.count)
  let maxFrameSize = UInt32(frames.map(\.count).max() ?? 0)
  let microsecondsPerFrame = UInt32(1_000_000 / Int(fps))
  let maxBytesPerSecond = maxFrameSize * UInt32(fps)

  var avih = Data()
  avih.append(le32(microsecondsPerFrame))
  avih.append(le32(maxBytesPerSecond))
  avih.append(le32(0))
  avih.append(le32(0x10))
  avih.append(le32(totalFrames))
  avih.append(le32(0))
  avih.append(le32(1))
  avih.append(le32(maxFrameSize))
  avih.append(le32(UInt32(outputWidth)))
  avih.append(le32(UInt32(outputHeight)))
  for _ in 0..<4 { avih.append(le32(0)) }

  var strh = Data()
  strh.append(fourCC("vids"))
  strh.append(fourCC("MJPG"))
  strh.append(le32(0))
  strh.append(le16(0))
  strh.append(le16(0))
  strh.append(le32(0))
  strh.append(le32(1))
  strh.append(le32(UInt32(fps)))
  strh.append(le32(0))
  strh.append(le32(totalFrames))
  strh.append(le32(maxFrameSize))
  strh.append(le32(UInt32.max))
  strh.append(le32(0))
  strh.append(le32(0))
  strh.append(le32(0))
  strh.append(le32(UInt32(outputWidth)))
  strh.append(le32(UInt32(outputHeight)))

  var strf = Data()
  strf.append(le32(40))
  strf.append(le32(UInt32(outputWidth)))
  strf.append(le32(UInt32(outputHeight)))
  strf.append(le16(1))
  strf.append(le16(24))
  strf.append(fourCC("MJPG"))
  strf.append(le32(maxFrameSize))
  strf.append(le32(0))
  strf.append(le32(0))
  strf.append(le32(0))
  strf.append(le32(0))

  let strl = list("strl", chunk("strh", strh) + chunk("strf", strf))
  let hdrl = list("hdrl", chunk("avih", avih) + strl)

  var moviFrames = Data()
  var index = Data()
  for frame in frames {
    let offset = UInt32(moviFrames.count + 4)
    moviFrames.append(chunk("00dc", frame))
    index.append(fourCC("00dc"))
    index.append(le32(0x10))
    index.append(le32(offset))
    index.append(le32(UInt32(frame.count)))
  }

  let movi = list("movi", moviFrames)
  let idx1 = chunk("idx1", index)
  let aviPayload = fourCC("AVI ") + hdrl + movi + idx1
  var riff = Data()
  riff.append(fourCC("RIFF"))
  riff.append(le32(UInt32(aviPayload.count)))
  riff.append(aviPayload)
  return riff
}

try? FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
try? FileManager.default.removeItem(at: outputURL)

let totalDuration = scenes.reduce(0) { $0 + $1.duration }
var elapsed = 0.0
var frames: [Data] = []

for scene in scenes {
  let sceneFrames = Int(scene.duration * Double(fps))
  for localFrame in 0..<sceneFrames {
    let progress = (elapsed + Double(localFrame) / Double(fps)) / totalDuration
    frames.append(renderJPEG(scene: scene, progress: progress))
  }
  elapsed += scene.duration
}

try makeAvi(frames: frames).write(to: outputURL)
print("Created \(outputURL.path)")
