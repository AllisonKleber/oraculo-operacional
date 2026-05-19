import os
import json
import sys
from pathlib import Path

def extract_with_docling(pdf_path: str) -> list:
    from docling.document_converter import DocumentConverter

    print(f"  Convertendo com Docling...")
    converter = DocumentConverter()
    result = converter.convert(pdf_path)
    md = result.document.export_to_markdown()

    source = Path(pdf_path).stem
    chunks = []
    chunk_id = 0
    current = {"title": "Geral", "content": ""}

    for line in md.split("\n"):
        stripped = line.strip()
        if stripped.startswith("## ") or stripped.startswith("# "):
            if current["content"].strip():
                chunks.append({**current})
            current = {"title": stripped.lstrip("#").strip(), "content": ""}
        elif stripped.startswith("### "):
            if current["content"].strip():
                chunks.append({**current})
            current = {"title": stripped.lstrip("#").strip(), "content": ""}
        else:
            current["content"] += line + "\n"

    if current["content"].strip():
        chunks.append({**current})

    result_chunks = []
    for sec in chunks:
        content = sec["content"].strip()
        if len(content) < 40:
            continue
        result_chunks.append({
            "id": f"{source}-{chunk_id}",
            "source": source,
            "section": sec["title"],
            "content": content,
        })
        chunk_id += 1

    return result_chunks


def main():
    from upstash_redis import Redis

    pdf_folder = Path("Procedimentos")
    if not pdf_folder.exists():
        print("Pasta 'Procedimentos/' não encontrada.")
        sys.exit(1)

    pdf_files = list(pdf_folder.glob("*.pdf"))
    if not pdf_files:
        print("Nenhum PDF encontrado em 'Procedimentos/'.")
        sys.exit(0)

    all_chunks = []
    for pdf_file in pdf_files:
        print(f"\nProcessando: {pdf_file.name}")
        try:
            chunks = extract_with_docling(str(pdf_file))
            all_chunks.extend(chunks)
            print(f"  → {len(chunks)} seções extraídas")
        except Exception as e:
            print(f"  ⚠ Erro ao processar {pdf_file.name}: {e}")

    if not all_chunks:
        print("\nNenhum conteúdo extraído.")
        sys.exit(1)

    print(f"\nSalvando {len(all_chunks)} chunks no Upstash...")
    redis = Redis(
        url=os.environ["UPSTASH_REDIS_REST_URL"],
        token=os.environ["UPSTASH_REDIS_REST_TOKEN"],
    )
    redis.set("oraculo:knowledge_chunks", json.dumps(all_chunks, ensure_ascii=False))
    print(f"✅ Concluído! {len(all_chunks)} chunks salvos.")


if __name__ == "__main__":
    main()
