def calculate_percentile(score, all_scores):
    """Midrank percentile for stable percentiles with ties."""
    if score is None or not all_scores:
        return None
    total = len(all_scores)
    less = sum(1 for s in all_scores if s < score)
    equal = sum(1 for s in all_scores if s == score)
    return round(((less + 0.5 * equal) / total) * 100, 2)

def competition_rank(score, all_scores):
    if score is None or not all_scores:
        return None
    higher = sum(1 for s in all_scores if s > score)
    return higher + 1
