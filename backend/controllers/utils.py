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
