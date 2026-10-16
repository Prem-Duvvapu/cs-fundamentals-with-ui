"""Train a tiny logistic classifier. Synthetic data; no model API, GPU or extra packages."""
import hashlib
import json
import math
import random
from pathlib import Path


def dataset(seed=42, count=160):
    rng = random.Random(seed)
    rows = []
    for index in range(count):
        late_days = rng.randrange(0, 12)
        previous_contacts = rng.randrange(0, 6)
        # Known synthetic process, not a claim about real customer behavior.
        probability = 1 / (1 + math.exp(-(-4 + 0.65 * late_days + 0.6 * previous_contacts)))
        label = int(rng.random() < probability)
        rows.append({'id': f'synthetic-{index}', 'features': [late_days if index % 19 else None, previous_contacts], 'label': label})
    return rows


def fit_preprocessor(rows):
    if not rows:
        raise ValueError('Training rows required')
    columns = list(zip(*(row['features'] for row in rows)))
    means = [sum(x for x in col if x is not None) / sum(x is not None for x in col) for col in columns]
    scales = [math.sqrt(sum(((x if x is not None else mean) - mean) ** 2 for x in col) / len(col)) or 1
              for col, mean in zip(columns, means)]
    return {'means': means, 'scales': scales}


def transform(features, prep):
    return [1.0] + [((x if x is not None else mean) - mean) / scale
                    for x, mean, scale in zip(features, prep['means'], prep['scales'])]


def score(features, model):
    z = sum(x * weight for x, weight in zip(transform(features, model['preprocessor']), model['weights']))
    return 1 / (1 + math.exp(-max(-50, min(50, z))))


def loss(rows, model):
    total = 0
    for row in rows:
        p = max(1e-12, min(1 - 1e-12, score(row['features'], model)))
        total -= row['label'] * math.log(p) + (1 - row['label']) * math.log(1 - p)
    return total / len(rows)


def train(rows, epochs=600, rate=0.1):
    model = {'preprocessor': fit_preprocessor(rows), 'weights': [0.0, 0.0, 0.0]}
    initial = loss(rows, model)
    for _ in range(epochs):
        gradient = [0.0] * 3
        for row in rows:
            error = score(row['features'], model) - row['label']
            for j, value in enumerate(transform(row['features'], model['preprocessor'])):
                gradient[j] += error * value / len(rows)
        model['weights'] = [weight - rate * g for weight, g in zip(model['weights'], gradient)]
    model['training'] = {'epochs': epochs, 'learning_rate': rate, 'initial_loss': initial, 'final_loss': loss(rows, model)}
    return model


def metrics(rows, model, threshold=0.5):
    tp = fp = fn = tn = 0
    squared_error = 0.0
    for row in rows:
        p = score(row['features'], model)
        predicted = p >= threshold
        tp += int(predicted and row['label'] == 1)
        fp += int(predicted and row['label'] == 0)
        fn += int(not predicted and row['label'] == 1)
        tn += int(not predicted and row['label'] == 0)
        squared_error += (p - row['label']) ** 2
    precision = tp / (tp + fp) if tp + fp else None
    recall = tp / (tp + fn) if tp + fn else None
    return dict(tp=tp, fp=fp, fn=fn, tn=tn, accuracy=(tp + tn) / len(rows), precision=precision,
                recall=recall, brier_score=squared_error / len(rows))


def observe():
    rows = dataset()
    # Split by synthetic record ID before fitting anything; no entity appears in two splits.
    train_rows, validation, held_out = rows[:100], rows[100:130], rows[130:]
    model = train(train_rows)
    thresholds = [0.3, 0.5, 0.7]
    validation_reports = {str(t): metrics(validation, model, t) for t in thresholds}
    # Select once using validation only; never choose a threshold on held-out scores.
    chosen = max(thresholds, key=lambda t: validation_reports[str(t)]['accuracy'])
    return {'evidence': 'actual small-model training on synthetic data; no generative model',
            'seed': 42, 'data_sha256': hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest(),
            'split_sizes': [len(train_rows), len(validation), len(held_out)], 'model': model,
            'validation': validation_reports, 'chosen_threshold': chosen,
            'held_out': metrics(held_out, model, chosen),
            'always_positive_accuracy': sum(row['label'] for row in held_out) / len(held_out),
            'limits': 'Small artificial independent records; not real-world generalization or a calibrated risk service.'}


if __name__ == '__main__':
    print(json.dumps(observe(), indent=2))
