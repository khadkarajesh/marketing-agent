def split_conversation_into_pairs(conversation: str):
    """
    Splits a conversation transcript into question-answer pairs.
    Expected format: each line starts with "AI:" or "Founder:".
    """

    lines = [line.strip() for line in conversation.split("\n") if line.strip()]
    dialogue = []

    # Convert each line into structure: (speaker, text)
    parsed = []
    for line in lines:
        if line.startswith("AI:"):
            parsed.append(("AI", line[len("AI:"):].strip()))
        elif line.startswith("Founder:"):
            parsed.append(("Founder", line[len("Founder:"):].strip()))
        else:
            # Unknown line format, skip or handle
            continue

    # Build question-answer pairs
    pairs = []
    i = 0
    while i < len(parsed) - 1:
        speaker, content = parsed[i]
        next_speaker, next_content = parsed[i + 1]

        # AI -> Founder pair (AI asks, Founder answers)
        if speaker == "AI" and next_speaker == "Founder":
            pairs.append(f"question:{content} answer:{next_content}"
            )
            i += 2
        else:
            i += 1  # Skip if the pattern doesn't match

    return pairs

def parse_pdf_slides_clean(pdf_slides_text):
    """
    Parse PDF slides text into a list of strings without slide headers.
    
    Args:
        pdf_slides_text (list): List of slide strings in the given format
        
    Returns:
        list: List of strings, one per slide without slide headers
    """
    parsed_slides = []
    
    for slide in pdf_slides_text:
        lines = slide.split('\n')
        
        # Skip the first line (slide header) and clean remaining lines
        cleaned_lines = [line.strip() for line in lines[1:] if line.strip()]
        
        slide_content = '\n'.join(cleaned_lines)
        parsed_slides.append(slide_content)
    
    return parsed_slides