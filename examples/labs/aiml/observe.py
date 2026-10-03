"""Small synthetic evaluation examples; no model, network or paid API is used."""

import json


def binary_metrics(labels, predictions):
    if not labels or len(labels) != len(predictions):
        raise ValueError('Provide equally sized, nonempty labels and predictions')
    if any(value not in (0, 1) for value in (*labels, *predictions)):
        raise ValueError('This exercise accepts binary 0/1 values')
    tp = sum(actual == predicted == 1 for actual, predicted in zip(labels, predictions))
    fp = sum(actual == 0 and predicted == 1 for actual, predicted in zip(labels, predictions))
    fn = sum(actual == 1 and predicted == 0 for actual, predicted in zip(labels, predictions))
    tn = len(labels) - tp - fp - fn
    return {
        'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn,
        'accuracy': (tp + tn) / len(labels),
        'precision': tp / (tp + fp) if tp + fp else None,
        'recall': tp / (tp + fn) if tp + fn else None,
    }


def binary_auc(labels, scores):
    """Pairwise definition for tiny teaching sets, not a production implementation."""
    if not labels or len(labels) != len(scores) or any(label not in (0, 1) for label in labels):
        raise ValueError('Provide aligned binary labels and scores')
    positives = [score for label, score in zip(labels, scores) if label == 1]
    negatives = [score for label, score in zip(labels, scores) if label == 0]
    if not positives or not negatives:
        raise ValueError('ROC AUC requires both classes')
    credits = sum(1 if positive > negative else 0.5 if positive == negative else 0
                  for positive in positives for negative in negatives)
    return credits / (len(positives) * len(negatives))


def retrieval_metrics(ranked_ids, relevant_ids, k):
    """Relevance recall, distinct from overlap with an exact nearest-neighbor index."""
    relevant = set(relevant_ids)
    if not relevant or not isinstance(k, int) or isinstance(k, bool) or k < 1:
        raise ValueError('Define a nonempty relevance set and positive integer k')
    matches = set(ranked_ids[:k]) & relevant
    return {'hit_rate': float(bool(matches)), 'recall': len(matches) / len(relevant)}


def observe():
    labels = [1] * 10 + [0] * 90
    predictions = [1] * 8 + [0] * 2 + [1] * 2 + [0] * 88
    return {
        'ticket_classifier': binary_metrics(labels, predictions),
        'always_negative_baseline': binary_metrics(labels, [0] * 100),
        'constant_score_auc': binary_auc(labels, [0.5] * 100),
        'rag_one_of_three': retrieval_metrics(['policy-a', 'unrelated'],
                                               ['policy-a', 'policy-b', 'policy-c'], 2),
    }


if __name__ == '__main__':
    print(json.dumps(observe(), indent=2))
