export interface ParsedLink {
  uuid: string
  title: string
}

// Matches [[xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:Any Title Here]]
const LINK_RE = /\[\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):([^\]]*)\]\]/g

export function parseLinks(body: string): ParsedLink[] {
  const links: ParsedLink[] = []
  let m
  const re = new RegExp(LINK_RE.source, 'g')
  while ((m = re.exec(body)) !== null) {
    links.push({ uuid: m[1], title: m[2] })
  }
  return links
}
