"""
PDF Ingestion Pipeline for the Smart Workout Recommender RAG system.

This script:
  1. Auto-discovers fitness-related PDFs from trusted open-access publishers
  2. Downloads them to scripts/pdfs/
  3. Chunks the text using LlamaIndex SentenceSplitter
  4. Embeds chunks with OpenAI text-embedding-3-large
  5. Stores vectors in Qdrant Cloud

Usage:
  pip install -r requirements.txt
  python ingest.py                    # discover + ingest
  python ingest.py --local-only       # only process PDFs already in scripts/pdfs/
  python ingest.py --clear            # wipe collection and re-ingest everything
"""

import os
import sys
import argparse
import hashlib
import requests
from pathlib import Path

from bs4 import BeautifulSoup
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

from llama_index.core.node_parser import SentenceSplitter
from llama_index.readers.file import PDFReader

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

COLLECTION_NAME = "fitness_knowledge"
VECTOR_SIZE = 3072  # text-embedding-3-large
CHUNK_SIZE = 512    # tokens
CHUNK_OVERLAP = 50  # tokens
PDF_DIR = Path(__file__).parent / "pdfs"

# Trusted open-access sources for fitness PDFs
TRUSTED_SOURCES = [
    {
        "name": "ACE Fitness",
        "url": "https://www.acefitness.org/resources/everyone/blog/",
        "description": "American Council on Exercise resources",
    },
    {
        "name": "NSCA",
        "url": "https://www.nsca.com/education/articles/",
        "description": "National Strength and Conditioning Association",
    },
    {
        "name": "PubMed Central (exercise science)",
        "url": "https://www.ncbi.nlm.nih.gov/pmc/",
        "description": "Open-access exercise science papers",
    },
]

# Direct links to freely available fitness PDFs
SEED_PDFS = [
    {
        "url": "https://www.who.int/publications/i/item/9789240015128",
        "filename": "who_physical_activity_guidelines.pdf",
        "title": "WHO Guidelines on Physical Activity and Sedentary Behaviour",
    },
    {
        "url": "https://health.gov/sites/default/files/2019-09/Physical_Activity_Guidelines_2nd_edition.pdf",
        "filename": "us_physical_activity_guidelines.pdf",
        "title": "US Physical Activity Guidelines",
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_openai_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set.")
        sys.exit(1)
    return OpenAI(api_key=api_key)


def get_qdrant_client():
    url = os.environ.get("QDRANT_URL")
    api_key = os.environ.get("QDRANT_API_KEY")
    if not url or not api_key:
        print("Error: QDRANT_URL and QDRANT_API_KEY environment variables must be set.")
        sys.exit(1)
    return QdrantClient(url=url, api_key=api_key)


def ensure_collection(qdrant: QdrantClient, clear: bool = False):
    collections = [c.name for c in qdrant.get_collections().collections]

    if clear and COLLECTION_NAME in collections:
        qdrant.delete_collection(COLLECTION_NAME)
        print(f"Deleted existing collection: {COLLECTION_NAME}")
        collections.remove(COLLECTION_NAME)

    if COLLECTION_NAME not in collections:
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"Created collection: {COLLECTION_NAME}")
    else:
        print(f"Collection {COLLECTION_NAME} already exists")


# ---------------------------------------------------------------------------
# PDF Discovery & Download
# ---------------------------------------------------------------------------

def discover_pdfs_from_page(url, source_name):
    """Crawl a page and find links to PDF files."""
    discovered = []
    try:
        headers = {"User-Agent": "Mozilla/5.0 (FitnessRAG Bot; educational project)"}
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        for link in soup.find_all("a", href=True):
            href = link["href"]
            if href.lower().endswith(".pdf"):
                full_url = href if href.startswith("http") else requests.compat.urljoin(url, href)
                filename = full_url.split("/")[-1].split("?")[0]
                if not filename.endswith(".pdf"):
                    filename += ".pdf"
                discovered.append({
                    "url": full_url,
                    "filename": filename,
                    "source": source_name,
                })
    except Exception as e:
        print(f"  Warning: could not crawl {source_name}: {e}")

    return discovered


def download_pdf(url, filename):
    """Download a PDF to the pdfs directory. Returns True if new file downloaded."""
    filepath = PDF_DIR / filename
    if filepath.exists():
        print(f"  Already exists: {filename}")
        return False

    try:
        headers = {"User-Agent": "Mozilla/5.0 (FitnessRAG Bot; educational project)"}
        resp = requests.get(url, headers=headers, timeout=30, stream=True)
        resp.raise_for_status()

        content_type = resp.headers.get("content-type", "")
        if "pdf" not in content_type and "octet-stream" not in content_type:
            print(f"  Skipping {filename}: not a PDF (content-type: {content_type})")
            return False

        with open(filepath, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        size_kb = filepath.stat().st_size / 1024
        print(f"  Downloaded: {filename} ({size_kb:.0f} KB)")
        return True

    except Exception as e:
        print(f"  Failed to download {filename}: {e}")
        return False


def auto_discover_and_download():
    """Discover PDFs from trusted sources and download them."""
    print("\n--- Auto-discovering fitness PDFs ---")
    PDF_DIR.mkdir(parents=True, exist_ok=True)

    all_pdfs = []

    # Add seed PDFs
    for seed in SEED_PDFS:
        all_pdfs.append(seed)

    # Crawl trusted sources
    for source in TRUSTED_SOURCES:
        print(f"Crawling {source['name']}...")
        found = discover_pdfs_from_page(source["url"], source["name"])
        print(f"  Found {len(found)} PDFs")
        all_pdfs.extend(found[:5])  # limit to 5 per source to be respectful

    # Download
    downloaded = 0
    for pdf_info in all_pdfs:
        filename = pdf_info.get("filename", pdf_info["url"].split("/")[-1])
        if download_pdf(pdf_info["url"], filename):
            downloaded += 1

    print(f"\nDownloaded {downloaded} new PDFs. Total in folder: {len(list(PDF_DIR.glob('*.pdf')))}")


# ---------------------------------------------------------------------------
# Chunking & Embedding
# ---------------------------------------------------------------------------

def load_and_chunk_pdfs():
    """Read all PDFs in the pdfs/ directory and split into chunks."""
    pdf_files = list(PDF_DIR.glob("*.pdf"))
    if not pdf_files:
        print("No PDFs found in scripts/pdfs/ -- nothing to ingest.")
        return []

    print(f"\n--- Processing {len(pdf_files)} PDFs ---")

    reader = PDFReader()
    splitter = SentenceSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)

    all_chunks = []
    for pdf_path in pdf_files:
        print(f"  Reading: {pdf_path.name}")
        try:
            documents = reader.load_data(file=pdf_path)
            for doc in documents:
                nodes = splitter.get_nodes_from_documents([doc])
                for j, node in enumerate(nodes):
                    content = node.get_content().strip()
                    if len(content) < 50:
                        continue  # skip trivially small chunks

                    chunk_id = hashlib.md5(
                        f"{pdf_path.name}:{j}:{content[:100]}".encode()
                    ).hexdigest()

                    all_chunks.append({
                        "id": chunk_id,
                        "content": content,
                        "source": pdf_path.stem,
                        "section": f"chunk_{j}",
                        "filename": pdf_path.name,
                    })
        except Exception as e:
            print(f"  Error reading {pdf_path.name}: {e}")

    print(f"  Total chunks: {len(all_chunks)}")
    return all_chunks


def embed_chunks(openai_client, chunks):
    """Embed all chunks using OpenAI text-embedding-3-large."""
    print(f"\n--- Embedding {len(chunks)} chunks ---")
    texts = [c["content"] for c in chunks]
    embeddings = []

    batch_size = 20
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        print(f"  Embedding batch {i // batch_size + 1}/{(len(texts) - 1) // batch_size + 1}...")
        response = openai_client.embeddings.create(
            model="text-embedding-3-large",
            input=batch,
        )
        sorted_data = sorted(response.data, key=lambda d: d.index)
        embeddings.extend([d.embedding for d in sorted_data])

    return embeddings


def store_in_qdrant(qdrant: QdrantClient, chunks, embeddings):
    """Upsert all chunks with embeddings into Qdrant."""
    print(f"\n--- Storing {len(chunks)} vectors in Qdrant ---")

    points = []
    for i, chunk in enumerate(chunks):
        points.append(
            PointStruct(
                id=i,
                vector=embeddings[i],
                payload={
                    "content": chunk["content"],
                    "source": chunk["source"],
                    "section": chunk["section"],
                    "filename": chunk["filename"],
                },
            )
        )

    batch_size = 50
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        qdrant.upsert(collection_name=COLLECTION_NAME, points=batch)
        print(f"  Upserted batch {i // batch_size + 1}/{(len(points) - 1) // batch_size + 1}")

    info = qdrant.get_collection(COLLECTION_NAME)
    print(f"  Collection now has {info.points_count} vectors")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Ingest fitness PDFs into Qdrant for RAG")
    parser.add_argument("--local-only", action="store_true",
                        help="Skip auto-discovery, only process PDFs already in scripts/pdfs/")
    parser.add_argument("--clear", action="store_true",
                        help="Clear existing collection before ingesting")
    args = parser.parse_args()

    # Step 1: Optionally discover and download PDFs
    if not args.local_only:
        auto_discover_and_download()

    # Step 2: Load and chunk PDFs
    chunks = load_and_chunk_pdfs()
    if not chunks:
        print("No chunks to process. Add PDFs to scripts/pdfs/ and try again.")
        return

    # Step 3: Set up clients
    openai_client = get_openai_client()
    qdrant = get_qdrant_client()

    # Step 4: Ensure collection exists
    ensure_collection(qdrant, clear=args.clear)

    # Step 5: Embed
    embeddings = embed_chunks(openai_client, chunks)

    # Step 6: Store
    store_in_qdrant(qdrant, chunks, embeddings)

    print("\nIngestion complete.")


if __name__ == "__main__":
    main()
