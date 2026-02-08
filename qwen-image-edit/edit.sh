#!/bin/bash

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: ./edit.sh <input_image> <prompt> [output_name]"
    echo ""
    echo "Examples:"
    echo "  ./edit.sh photo.png \"photorealistic, natural lighting\""
    echo "  ./edit.sh field.jpg \"rainy weather, wet soil\" rainy_field.png"
    exit 1
fi

INPUT="$1"
PROMPT="$2"
OUTPUT="${3:-}"

# Check input exists
if [ ! -f "$INPUT" ]; then
    echo "❌ Input file not found: $INPUT"
    exit 1
fi

# Activate virtual environment
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run ./setup.sh first."
    exit 1
fi

source venv/bin/activate

# Load config
GUIDANCE_SCALE=1.0
STEPS=4
if [ -f "config.txt" ]; then
    source <(grep -E '^[A-Z_]+=.+$' config.txt)
fi

# Generate output filename if not provided
if [ -z "$OUTPUT" ]; then
    BASENAME=$(basename "$INPUT" | sed 's/\.[^.]*$//')
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    OUTPUT="outputs/${BASENAME}_${TIMESTAMP}.png"
fi

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT")"

echo "🖼️  Input: $INPUT"
echo "📝 Prompt: $PROMPT"
echo "⚙️  Scale: $GUIDANCE_SCALE, Steps: $STEPS"
echo "💾 Output: $OUTPUT"
echo ""

# Run the model
python3 << PYTHON
import torch
from diffusers import QwenImageEditPlusPipeline
from PIL import Image
import time

input_path = "$INPUT"
prompt = """$PROMPT"""
output_path = "$OUTPUT"
guidance_scale = float($GUIDANCE_SCALE)
steps = int($STEPS)

# Setup device
device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"🖥️  Using device: {device}")

# Load model
print("📦 Loading model (first time takes longer)...")
start = time.time()

pipe = QwenImageEditPlusPipeline.from_pretrained(
    "Qwen/Qwen-Image-Edit-2511",
    torch_dtype=torch.float32
).to(device)

pipe.load_lora_weights(
    "lightx2v/Qwen-Image-Edit-2511-Lightning",
    weight_name="Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors"
)
pipe.fuse_lora()

load_time = time.time() - start
print(f"✅ Model loaded in {load_time:.1f}s")

# Load and process image
print("🎨 Processing image...")
start = time.time()

image = Image.open(input_path).convert("RGB")
result = pipe(
    image=[image],
    prompt=prompt,
    num_inference_steps=steps,
    true_cfg_scale=guidance_scale,
).images[0]

process_time = time.time() - start
print(f"✅ Processing complete in {process_time:.1f}s")

# Save
result.save(output_path)
print(f"💾 Saved to: {output_path}")
PYTHON

echo ""
echo "✅ Done!"
