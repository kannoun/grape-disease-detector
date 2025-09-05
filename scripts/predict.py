import torch
from torchvision import transforms
from PIL import Image
import timm
import json
import sys
import os

# Disease information
disease_info = {
    "Black_Measles": {
        "description": "Black Measles causes small dark spots on the grape leaf, often leading to leaf deformation.",
        "treatment": "Remove infected leaves and apply recommended fungicides to control spread."
    },
    "Black_Rot": {
        "description": "Black rot is a fungal disease causing dark spots and lesions on leaves and fruit.",
        "treatment": "Apply fungicides and remove affected leaves and fruit to prevent further infection."
    },
    "Healthy": {
        "description": "The grape leaf appears healthy with no visible signs of disease.",
        "treatment": "No treatment required. Continue regular vineyard maintenance."
    },
    "Isariopsis_Leaf_Spot": {
        "description": "Isariopsis Leaf Spot produces brown spots with yellow halos on leaves, which can lead to premature leaf drop.",
        "treatment": "Remove infected leaves and use fungicides as recommended to prevent spread."
    }
}

# Mapping from model's class names to disease_info keys
class_mapping = {
    "Healthy": "Healthy",
    "Black Rot": "Black_Rot",
    "Black Measles": "Black_Measles",
    "Isariopsis Leaf Spot": "Isariopsis_Leaf_Spot"
}

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Image path is required"}))
        sys.exit(1)

    image_path = sys.argv[1]

    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, "Model", "grape_leaf_disease_model.pth")
        metadata_path = os.path.join(script_dir, "Model", "model_metadata.json")

        # Load metadata
        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        classes = metadata["class_names"]
        num_classes = len(classes)
        input_size = metadata["config"]["img_size"]

        # Log class names for debugging
        print(f"DEBUG: Model class names: {classes}", file=sys.stderr)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Load model
        model = timm.create_model('efficientnet_b0', pretrained=False, num_classes=num_classes)
        model.classifier = torch.nn.Sequential(
            torch.nn.Linear(model.classifier.in_features, 256),
            torch.nn.BatchNorm1d(256),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.3),
            torch.nn.Linear(256, num_classes)
        )
        model.load_state_dict(torch.load(model_path, map_location=device))
        model = model.to(device)
        model.eval()

        # Image preprocessing
        transform = transforms.Compose([
            transforms.Resize(input_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        image = Image.open(image_path).convert("RGB")
        input_tensor = transform(image).unsqueeze(0).to(device)

        # Prediction
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1).cpu().numpy()[0]

        top_idx = probabilities.argmax()
        predicted_class = classes[top_idx]
        confidence = float(probabilities[top_idx])

        # Map class name to disease_info key
        mapped_class = class_mapping.get(predicted_class, predicted_class)

        # Log predicted and mapped class for debugging
        #print(f"DEBUG: Predicted class: {predicted_class}, Mapped class: {mapped_class}", file=sys.stderr)

        # Prepare JSON response
        response = {
            "disease": predicted_class,
            "confidence": confidence,
            "description": disease_info.get(mapped_class, {}).get("description", "No description available"),
            "treatment": disease_info.get(mapped_class, {}).get("treatment", "No treatment information available")
        }

        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()