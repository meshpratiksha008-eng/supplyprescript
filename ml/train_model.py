import pandas as pd, xgboost as xgb, joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OrdinalEncoder

df = pd.read_csv("data/shipments.csv")
cat_cols = ["origin","destination","carrier"]
enc = OrdinalEncoder()
df[cat_cols] = enc.fit_transform(df[cat_cols])

X = df.drop(columns=["is_delayed","delay_days"])
y_clf = df["is_delayed"]
y_reg = df["delay_days"]

X_train, X_test, ytr, yte = train_test_split(X, y_clf, test_size=0.2)
clf = xgb.XGBClassifier(n_estimators=200, max_depth=4)
clf.fit(X_train, ytr)
print("Accuracy:", clf.score(X_test, yte))

reg = xgb.XGBRegressor(n_estimators=200, max_depth=4)
reg.fit(X_train, y_reg.loc[X_train.index])

joblib.dump({"clf": clf, "reg": reg, "encoder": enc}, "ml/model.pkl")
print("Model saved to ml/model.pkl")