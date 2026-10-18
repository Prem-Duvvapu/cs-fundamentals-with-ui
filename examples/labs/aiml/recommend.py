"""Original teaching fixtures: exact cosine search, authored scores, no trained model."""

from collections import Counter
from dataclasses import dataclass, replace
import json
import math


@dataclass(frozen=True)
class Item:
    creator: str
    eligible: bool
    p_click: float
    p_purchase_given_click: float
    margin: float


def positive_integer(value):
    if not isinstance(value, int) or isinstance(value, bool) or value < 1:
        raise ValueError('Use a positive integer cutoff or cap')


def cosine(left, right):
    if not left or len(left) != len(right):
        raise ValueError('Provide aligned nonempty vectors')
    if any(not math.isfinite(value) for value in (*left, *right)):
        raise ValueError('Vector components must be finite')
    # Scaling before arithmetic avoids overflowing the dot product or squared norm.
    left_scale, right_scale = max(map(abs, left)), max(map(abs, right))
    if left_scale == 0 or right_scale == 0:
        raise ValueError('Cosine is undefined for a zero vector')
    left = [value / left_scale for value in left]
    right = [value / right_scale for value in right]
    return sum(a * b for a, b in zip(left, right)) / (
        math.sqrt(sum(value * value for value in left)) *
        math.sqrt(sum(value * value for value in right)))


def retrieve(query, indexed_vectors, k):
    """Exhaustively score the authored vector index; ties use the stable item ID."""
    positive_integer(k)
    scored = [(identifier, cosine(query, vector))
              for identifier, vector in indexed_vectors.items()]
    return [identifier for identifier, _ in sorted(scored, key=lambda pair: (-pair[1], pair[0]))[:k]]


def utility(item):
    probabilities = (item.p_click, item.p_purchase_given_click)
    if any(not math.isfinite(value) or not 0 <= value <= 1 for value in probabilities):
        raise ValueError('Authored probabilities must be finite and in [0, 1]')
    if not math.isfinite(item.margin) or item.margin < 0:
        raise ValueError('Margin must be finite and nonnegative')
    return item.p_click * item.p_purchase_given_click * item.margin


def rank(candidate_ids, current_catalog, consumed=()):
    """Hydrate current metadata; an index hit cannot authorize an unavailable item."""
    seen, consumed, allowed = set(), set(consumed), []
    for identifier in candidate_ids:
        if identifier in seen:
            continue
        seen.add(identifier)
        item = current_catalog.get(identifier)
        if item is not None and item.eligible and identifier not in consumed:
            allowed.append((identifier, utility(item)))
    return [identifier for identifier, _ in sorted(allowed, key=lambda pair: (-pair[1], pair[0]))]


def select(ordered_ids, current_catalog, consumed=(), limit=2, creator_cap=1):
    """Apply current eligibility again and a hard creator cap; short lists are valid."""
    positive_integer(limit)
    positive_integer(creator_cap)
    consumed, seen, creators, selected = set(consumed), set(), Counter(), []
    for identifier in ordered_ids:
        item = current_catalog.get(identifier)
        if (identifier in seen or identifier in consumed or item is None or
                not item.eligible or creators[item.creator] >= creator_cap):
            continue
        seen.add(identifier)
        selected.append(identifier)
        creators[item.creator] += 1
        if len(selected) == limit:
            break
    return selected


def recommend(query, indexed_vectors, current_catalog, *, k=2, consumed=(),
              retrieval_available=True, editorial=('b', 'e'), limit=2, creator_cap=1):
    if retrieval_available:
        candidates = retrieve(query, indexed_vectors, k)
        ordered = rank(candidates, current_catalog, consumed)
        source = 'exact-cosine-authored-ranking'
    else:
        candidates, ordered = list(editorial), list(editorial)
        source = 'editorial-fallback'
    return {'source': source, 'candidates': candidates, 'ordered': ordered,
            'selected': select(ordered, current_catalog, consumed, limit, creator_cap)}


def distinct_ids(identifiers):
    if len(set(identifiers)) != len(identifiers):
        raise ValueError('Evaluation requires unique item IDs; deduplicate the serving list')


def recall_at_k(identifiers, relevant, k):
    positive_integer(k)
    distinct_ids(identifiers)
    relevant = set(relevant)
    if not relevant:
        raise ValueError('Recall is undefined without relevant items')
    return len(set(identifiers[:k]) & relevant) / len(relevant)


def ndcg_at_k(identifiers, grades, k):
    """Graded gain (2**grade - 1), fixed cutoff, full eligible judgment-set ideal."""
    positive_integer(k)
    distinct_ids(identifiers)
    if any(not math.isfinite(grade) or not 0 <= grade <= 30 for grade in grades.values()):
        raise ValueError('Use finite relevance grades between 0 and 30')
    ideal_grades = sorted(grades.values(), reverse=True)[:k]
    ideal = sum((2 ** grade - 1) / math.log2(position + 2)
                for position, grade in enumerate(ideal_grades))
    if ideal == 0:
        raise ValueError('NDCG is undefined without positive relevance judgments')
    actual = sum((2 ** grades.get(identifier, 0) - 1) / math.log2(position + 2)
                 for position, identifier in enumerate(identifiers[:k]))
    return actual / ideal


def fixtures():
    # Both vectors and probabilities are authored, not learned or calibrated.
    index = {'a': (1, 0), 'b': (.9, .1), 'c': (.8, .2), 'e': (0, 1)}
    catalog = {
        'a': Item('creator-x', True, .16, .08, 25),
        'b': Item('creator-y', True, .12, .20, 15),
        'c': Item('creator-z', True, .20, .50, 20),
        'd': Item('creator-new', True, .30, .50, 20),
        'e': Item('creator-x', True, .10, .10, 10),
    }
    return (1, 0), index, catalog, {'c': 3, 'b': 2}


def observe():
    query, index, catalog, grades = fixtures()
    small = recommend(query, index, catalog, k=2)
    large = recommend(query, index, catalog, k=3)
    for result in (small, large):
        result['candidate_recall'] = recall_at_k(result['candidates'], grades, len(result['candidates']))
        result['ndcg_at_2'] = ndcg_at_k(result['selected'], grades, 2)
    unavailable = dict(catalog, b=replace(catalog['b'], eligible=False))
    return {
        'fixture_scope': 'Original authored vectors, probabilities and relevance grades; no training, ANN, or live outcomes',
        'k2': small, 'k3': large,
        'stale_candidate': recommend(query, index, unavailable, k=2),
        'fallback': recommend(query, index, catalog, consumed=('b',), retrieval_available=False),
        'cold_item': {'id': 'd', 'in_catalog': True, 'in_vector_index': False,
                      'explanation': 'Ranking cannot show d until a candidate source supplies it'},
    }


if __name__ == '__main__':
    print(json.dumps(observe(), indent=2, allow_nan=False))
