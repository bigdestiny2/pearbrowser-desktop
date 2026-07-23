import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const mobileRoot = new URL('../../PearBrowser/', import.meta.url)
const hasMobileCheckout = existsSync(mobileRoot)

function source (path) {
  return readFileSync(new URL(path, mobileRoot), 'utf8')
}

function includesAll (text, fragments) {
  for (const fragment of fragments) {
    assert.ok(text.includes(fragment), `missing source fragment: ${fragment}`)
  }
}

test('mobile QR scanner accepts supported P2P QR forms and is wired from Home to Browse', { skip: !hasMobileCheckout && 'mobile checkout is not present in this isolated desktop worktree' }, () => {
  const qr = source('app/screens/QRScannerScreen.tsx')
  const app = source('app/App.tsx')

  includesAll(qr, [
    'CameraView',
    'useCameraPermissions',
    "url.startsWith('hyper://')",
    "onScan(`hyper://${url}`)",
    "url.startsWith('https://') && url.includes('p2phiverelay')",
    "Alert.alert('Invalid QR'",
    'setScanned(false)',
    'Grant Access',
    'onClose',
  ])
  assert.match(qr, /\^\[a-f0-9\]\{52,64\}\$/)

  includesAll(app, [
    'showQRScanner',
    '<QRScannerScreen',
    'onOpenQR={() => setShowQRScanner(true)}',
    'setShowQRScanner(false)',
    'handleNavigate(url)',
  ])
})

test('mobile Bookmarks, History, and More hub expose local data workflows and status actions', { skip: !hasMobileCheckout && 'mobile checkout is not present in this isolated desktop worktree' }, () => {
  const bookmarks = source('app/screens/BookmarksScreen.tsx')
  const history = source('app/screens/HistoryScreen.tsx')
  const more = source('app/screens/MoreScreen.tsx')
  const app = source('app/App.tsx')

  includesAll(bookmarks, [
    'getBookmarks().then(setBookmarks)',
    'removeBookmark(url)',
    'onPress={() => onOpen(b.url)}',
    'No bookmarks yet',
    'Bookmark sites while browsing',
  ])

  includesAll(history, [
    'getHistory().then(setHistory)',
    "Alert.alert('Clear History'",
    'await clearHistory()',
    'setHistory([])',
    'onPress={() => onOpen(h.url)}',
    'groupByDay(history)',
    'No history',
  ])

  includesAll(more, [
    'setInterval(fetchDetails, 5000)',
    'rpc.getStatus()',
    "MenuItem label=\"My Sites\"",
    "MenuItem label=\"Bookmarks\"",
    "MenuItem label=\"History\"",
    'label="P2P Status"',
    "MenuItem label=\"My Identity\"",
    "MenuItem label=\"Add Catalog\"",
    "MenuItem label=\"Settings\"",
    'rpc.getIdentity()',
    'Clipboard.setString(publicKey)',
    'addCatalog(trimmed)',
    "Platform.OS === 'ios' && Alert.prompt",
  ])

  includesAll(app, [
    'setShowBookmarks(true)',
    'setShowHistory(true)',
    'setShowSettings(true)',
    '<BookmarksScreen',
    '<HistoryScreen',
    '<MoreScreen',
    'onOpen={(url) => { handleNavigate(url); setShowBookmarks(false) }}',
    'onOpen={(url) => { handleNavigate(url); setShowHistory(false) }}',
  ])
})

test('mobile My Sites creates, lists, publishes, previews, shares, and deletes sites', { skip: !hasMobileCheckout && 'mobile checkout is not present in this isolated desktop worktree' }, () => {
  const mySites = source('app/screens/MySitesScreen.tsx')
  const app = source('app/App.tsx')

  includesAll(mySites, [
    'const list = await rpc.listSites()',
    'await rpc.createSite(newName.trim())',
    'const result = await rpc.publishSite(siteId)',
    'Share.share({',
    'await rpc.deleteSite(siteId)',
    'Delete Site',
    'onEditSite(site.siteId)',
    'onPreviewSite(site.url)',
    'No sites yet',
  ])

  includesAll(app, [
    '<MySitesScreen',
    'onEditSite={(siteId) => setEditingSiteId(siteId)}',
    'onPreviewSite={(url) => { handleNavigate(url); setShowSites(false) }}',
    'onCreateNew={(name) => { setPendingSiteName(name); setShowTemplatePicker(true) }}',
  ])
})

test('mobile template picker provides selectable starter templates and opens editor after site creation', { skip: !hasMobileCheckout && 'mobile checkout is not present in this isolated desktop worktree' }, () => {
  const picker = source('app/screens/TemplatePickerScreen.tsx')
  const app = source('app/App.tsx')

  for (const id of ['blank', 'personal', 'blog', 'portfolio', 'landing']) {
    assert.match(picker, new RegExp(`id: '${id}'`))
  }
  includesAll(picker, [
    'Pick a starting point for your site',
    'TEMPLATES.map((template)',
    'onPress={() => onSelect(template)}',
    'export { TEMPLATES }',
  ])

  includesAll(app, [
    '<TemplatePickerScreen',
    'setEditorTemplate(template)',
    'setShowTemplatePicker(false)',
    'const result = await rpcRef.current.createSite(pendingSiteName)',
    'setEditingSiteId(result.siteId)',
  ])
})

test('mobile site editor supports block editing, theme selection, preview, save, publish, and sharing', { skip: !hasMobileCheckout && 'mobile checkout is not present in this isolated desktop worktree' }, () => {
  const editor = source('app/screens/SiteEditorScreen.tsx')
  const app = source('app/App.tsx')

  includesAll(editor, [
    'const addBlock = useCallback',
    'const updateBlock = useCallback',
    'const removeBlock = useCallback',
    'const moveBlock = useCallback',
    'const addListItem = useCallback',
    'const updateListItem = useCallback',
    'const removeListItem = useCallback',
    'await rpc.updateSite(siteId, blocks, theme)',
    'const result = await rpc.publishSite(siteId)',
    'Share.share({ message: `Check out my P2P site: hyper://${key}`',
    'const previewHtml = generatePreviewHtml(blocks, theme',
    'setShowPreview(true)',
    'setShowThemePicker(true)',
    '<WebView',
    'THEME_PRESETS.map((preset)',
    'ToolbarBtn label="H" hint="Heading"',
    'ToolbarBtn label="T" hint="Text"',
    'ToolbarBtn label="=" hint="List"',
    'ToolbarBtn label="--" hint="Divider"',
    'ToolbarBtn label="{}" hint="Code"',
    'ToolbarBtn label="\'\'" hint="Quote"',
    'ToolbarBtn label="@" hint="Link"',
    'ToolbarBtn label="Img" hint="Image"',
  ])

  for (const blockType of ['heading', 'text', 'divider', 'code', 'quote', 'link', 'image', 'list']) {
    assert.match(editor, new RegExp(`case '${blockType}'`))
  }

  includesAll(app, [
    '<SiteEditorScreen',
    "initialBlocks={editorTemplate?.blocks?.map((b: any, i: number) => ({ ...b, id: 'tb' + i })) || undefined}",
    'initialTheme={editorTemplate?.theme || undefined}',
    'onPreview={(url) => { handleNavigate(url); setEditingSiteId(null); setEditorTemplate(null); setShowSites(false) }}',
  ])
})

test('mobile native Explore screens preserve safe catalog targets like React Native Explore', { skip: !hasMobileCheckout && 'mobile checkout is not present in this isolated desktop worktree' }, () => {
  const rn = source('app/screens/ExploreScreen.tsx')
  const ios = source('ios-native/PearBrowser/Sources/UI/Screens/ExploreScreen.swift')
  const android = source('android-native/app/src/main/java/com/pearbrowser/app/ui/screens/ExploreScreen.kt')

  includesAll(rn, [
    'normalizeEntry',
    'site.link',
    'onVisit(site.link)',
    'filter((site): site is SiteInfo => !!site)',
  ])

  includesAll(ios, [
    'let driveKey: String?',
    'let link: String?',
    'normalizeCatalogLink',
    'normalizeDriveKey',
    'driveKeyFromHyperLink',
    'onVisit(link)',
    'case "pear", "file"',
  ])

  includesAll(android, [
    'val driveKey: String?',
    'val link: String?',
    'normalizeCatalogLink',
    'normalizeDriveKey',
    'driveKeyFromHyperLink',
    'val target = site.link',
    '"pear", "file" ->',
  ])
})
