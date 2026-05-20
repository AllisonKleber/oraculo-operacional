import os
import json
import sys
from pathlib import Path


def extract_with_pdfplumber(pdf_path: str) -> list:
    import pdfplumber

    source = Path(pdf_path).stem
    chunks = []
    chunk_id = 0
    current_section = "Geral"
    current_content = ""

    print(f"  Extraindo texto com pdfplumber...")

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue

            for line in text.split("\n"):
                stripped = line.strip()
                if not stripped:
                    continue

                is_heading = (
                    stripped.isupper() and len(stripped) > 5
                    or (len(stripped) < 80 and stripped.endswith(":") and stripped[0].isupper())
                    or (stripped[:2].isdigit() and "." in stripped[:4])
                )

                if is_heading and current_content.strip():
                    if len(current_content.strip()) >= 40:
                        chunks.append({
                            "id": f"{source}-{chunk_id}",
                            "source": source,
                            "section": current_section,
                            "content": current_content.strip(),
                        })
                        chunk_id += 1
                    current_section = stripped
                    current_content = ""
                else:
                    current_content += stripped + " "

    if current_content.strip() and len(current_content.strip()) >= 40:
        chunks.append({
            "id": f"{source}-{chunk_id}",
            "source": source,
            "section": current_section,
            "content": current_content.strip(),
        })

    return chunks


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
            chunks = extract_with_pdfplumber(str(pdf_file))
            all_chunks.extend(chunks)
            print(f"  → {len(chunks)} seções extraídas")
        except Exception as e:
            print(f"  Erro ao processar {pdf_file.name}: {e}")
            sys.exit(1)

    if not all_chunks:
        print("\nNenhum conteúdo extraído.")
        sys.exit(1)

    print(f"\nSalvando {len(all_chunks)} chunks no Upstash...")
    redis = Redis(
        url=os.environ["UPSTASH_REDIS_REST_URL"],
        token=os.environ["UPSTASH_REDIS_REST_TOKEN"],
    )
    redis.set("oraculo:knowledge_chunks", json.dumps(all_chunks, ensure_ascii=False))
    print(f"Concluido! {len(all_chunks)} chunks salvos.")


if __name__ == "__main__":
    main()
