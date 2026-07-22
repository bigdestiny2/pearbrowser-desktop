// Pure helpers for the start-page web search. Keeping the provider contract in
// one framework-free module makes the destination and disclosure easy to test.

export const PRIVATE_SEARCH_PROVIDER = Object.freeze({
  name: 'DuckDuckGo',
  origin: 'https://duckduckgo.com/'
})

export function normalizePrivateSearchQuery (value) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/gu, ' ').slice(0, 2048)
}

export function buildPrivateSearchUrl (value) {
  const query = normalizePrivateSearchQuery(value)
  if (!query) return null
  const url = new URL(PRIVATE_SEARCH_PROVIDER.origin)
  url.searchParams.set('q', query)
  return url.toString()
}
