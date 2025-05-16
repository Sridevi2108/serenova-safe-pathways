import os
import numpy as np
import librosa
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.model_selection import train_test_split

# ✅ Corrected path
base_path = os.path.join("Sohas_weapon-Detection", "prepared_data")
non_weapon_dir = os.path.join(base_path, "non-weapons")
weapon_dir = os.path.join(base_path, "weapons")


# === LOAD AUDIO FILES & EXTRACT FEATURES ===
def extract_features_from_folder(folder_path, label):
    features = []
    labels = []
    for file in os.listdir(folder_path):
        if file.endswith(".wav") or file.endswith(".mp3"):
            file_path = os.path.join(folder_path, file)
            try:
                y, sr = librosa.load(file_path, sr=None)
                mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
                mfccs_processed = np.mean(mfccs.T, axis=0)
                features.append(mfccs_processed)
                labels.append(label)
            except Exception as e:
                print(f"Error processing {file}: {e}")
    return features, labels

# === PREPARE DATA ===
X_non, y_non = extract_features_from_folder(non_weapon_dir, 0)
X_weap, y_weap = extract_features_from_folder(weapon_dir, 1)

X = np.array(X_non + X_weap)
y = np.array(y_non + y_weap)

# === TRAIN TEST SPLIT ===
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# === DEFINE SIMPLE NN MODEL ===
model = Sequential()
model.add(Dense(64, input_shape=(X.shape[1],), activation='relu'))
model.add(Dropout(0.3))
model.add(Dense(32, activation='relu'))
model.add(Dropout(0.3))
model.add(Dense(1, activation='sigmoid'))

model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])

# === TRAIN ===
early_stop = EarlyStopping(monitor='val_loss', patience=3)
model.fit(X_train, y_train, validation_data=(X_test, y_test), epochs=20, batch_size=16, callbacks=[early_stop])

# === SAVE MODEL ===
model.save("models/audio_model.h5")
print("✅ Audio threat model saved to models/audio_model.h5")