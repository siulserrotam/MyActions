import numpy as np
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.schemas.responses import TrainResponse
from app.services.data_provider import MarketDataService
from app.services.indicators import IndicatorService


class TrainingService:
    feature_columns = [
        "rsi",
        "macd",
        "macd_hist",
        "ema_20",
        "ema_50",
        "atr",
        "adx",
        "cci",
        "roc",
        "hist_volatility",
        "daily_return",
        "trend_slope",
        "ema_cross_20_50",
    ]

    def train(self, ticker: str, force: bool = False) -> TrainResponse:
        frame = IndicatorService().with_indicators(MarketDataService().get_history(ticker))
        dataset = frame.copy()
        dataset["target"] = (dataset["close"].shift(-5) > dataset["close"]).astype(int)
        dataset = dataset.dropna()
        x = dataset[self.feature_columns]
        y = dataset["target"]

        candidates = {
            "RandomForest": RandomForestClassifier(n_estimators=120, random_state=42, class_weight="balanced"),
            "ExtraTrees": ExtraTreesClassifier(n_estimators=160, random_state=42, class_weight="balanced"),
        }
        splitter = TimeSeriesSplit(n_splits=5)
        best_name = ""
        best_metrics: dict[str, float] = {}
        best_score = -1.0

        for name, estimator in candidates.items():
            fold_metrics = []
            for train_idx, test_idx in splitter.split(x):
                pipeline = Pipeline([("scaler", StandardScaler()), ("model", estimator)])
                pipeline.fit(x.iloc[train_idx], y.iloc[train_idx])
                predictions = pipeline.predict(x.iloc[test_idx])
                probabilities = pipeline.predict_proba(x.iloc[test_idx])[:, 1]
                fold_metrics.append(
                    {
                        "accuracy": accuracy_score(y.iloc[test_idx], predictions),
                        "precision": precision_score(y.iloc[test_idx], predictions, zero_division=0),
                        "recall": recall_score(y.iloc[test_idx], predictions, zero_division=0),
                        "f1": f1_score(y.iloc[test_idx], predictions, zero_division=0),
                        "roc_auc": roc_auc_score(y.iloc[test_idx], probabilities),
                    }
                )
            metrics = {
                key: round(float(np.mean([fold[key] for fold in fold_metrics])), 4)
                for key in fold_metrics[0]
            }
            if metrics["f1"] > best_score:
                best_name = name
                best_score = metrics["f1"]
                best_metrics = metrics

        return TrainResponse(
            ticker=ticker,
            model=best_name,
            trained=True,
            metrics=best_metrics,
            message=("Reentrenamiento completado." if force else "Entrenamiento completado."),
        )
