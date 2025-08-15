from scholarly import scholarly
import json
from pprint import pprint
from pathlib import Path

def parse_scholar():
    data = []
    user_id = "XBZAHmIAAAAJ"
    author = scholarly.search_author_id(user_id)
    pubs = scholarly.fill(author, sections=["publications"])["publications"]
    pprint(pubs)
    for pub in pubs:
        author_pub_id = pub["author_pub_id"]
        bib = pub["bib"]
        title = bib.get("title", "")
        year = bib.get("pub_year", "")
        citation = bib.get("citation", "")
        journal = citation.split(",")[0].strip()
        if int(year) < 2020: # not going to display these
            continue
        data.append({
            "title": title,
            "year": year,
            "journal": journal,
            "url": f"https://scholar.google.com/citations?view_op=view_citation&hl=en&user=XBZAHmIAAAAJ&citation_for_view={author_pub_id}",
        })
    data = sorted(data, key=lambda x: x["year"], reverse=True)
    return data

def main():
    data = parse_scholar()
    with open(Path(__file__).parent / "publications.json", "w") as f:
        json.dump(data, f, indent=4)

if __name__ == "__main__":
    main()