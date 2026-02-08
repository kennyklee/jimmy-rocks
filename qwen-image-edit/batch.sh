#!/bin/bash

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: ./batch.sh <prompt> [input_folder] [output_folder]"
    echo ""
    echo "Examples:"
    echo "  ./batch.sh \"photorealistic photograph\""
    echo "  ./batch.sh \"rainy weather\" ./my_images ./my_outputs"
    exit 1
fi

PROMPT="$1"
INPUT_DIR="${2:-inputs}"
OUTPUT_DIR="${3:-outputs}"

# Check input directory
if [ ! -d "$INPUT_DIR" ]; then
    echo "❌ Input directory not found: $INPUT_DIR"
    echo "   Create it and add your images, or specify a different folder."
    exit 1
fi

# Count images
IMAGES=($(find "$INPUT_DIR" -maxdepth 1 -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" \)))
COUNT=${#IMAGES[@]}

if [ $COUNT -eq 0 ]; then
    echo "❌ No images found in $INPUT_DIR"
    echo "   Supported formats: .png, .jpg, .jpeg, .webp"
    exit 1
fi

echo "=========================================="
echo "  Qwen Image Edit - Batch Processing"
echo "=========================================="
echo ""
echo "📁 Input folder: $INPUT_DIR"
echo "📁 Output folder: $OUTPUT_DIR"
echo "📝 Prompt: $PROMPT"
echo "🖼️  Images found: $COUNT"
echo ""

# Activate virtual environment
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run ./setup.sh first."
    exit 1
fi

source venv/bin/activate
mkdir -p "$OUTPUT_DIR"

# Load config
GUIDANCE_SCALE=1.0
STEPS=4
if [ -f "config.txt" ]; then
    source <(grep -E '^[A-Z_]+=.+$' config.txt)
fi

echo "⚙️  Scale: $GUIDANCE_SCALE, Steps: $STEPS"
echo ""
read -p "Start processing? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

# Run batch processing
python3 << PYTHON
import torch
from diffusers import QwenImageEditPlusPipeline
from PIL import Image
import os
import time
from pathlib import Path

input_dir = "$INPUT_DIR"
output_dir = "$OUTPUT_DIR"
prompt = """$PROMPT"""
guidance_scale = float($GUIDANCE_SCALE)
steps = int($STEPS)

# Get all images
extensions = {'.png', '.jpg', '.jpeg', '.webp'}
images = [f for f in Path(input_dir).iterdir() 
          if f.suffix.lower() in extensions]
total = len(images)

print(f"")
print(f"🖥️  Setting up...")

# Setup device
device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"   Device: {device}")

# Load model once
print(f"📦 Loading model...")
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
print(f"")

# Process each image
total_time = 0
for i, img_path in enumerate(images, 1):
    print(f"[{i}/{total}] Processing: {img_path.name}")
    start = time.time()
    
    try:
        image = Image.open(img_path).convert("RGB")
        result = pipe(
            image=[image],
            prompt=prompt,
            num_inference_steps=steps,
            true_cfg_scale=guidance_scale,
        ).images[0]
        
        # Save with same name
        output_path = Path(output_dir) / f"{img_path.stem}_edited.png"
        result.save(output_path)
        
        elapsed = time.time() - start
        total_time += elapsed
        avg_time = total_time / i
        remaining = avg_time * (total - i)
        
        print(f"        ✅ Done in {elapsed:.1f}s (avg: {avg_time:.1f}s, ~{remaining/60:.0f}m remaining)")
        
    except Exception as e:
        print(f"        ❌ Error: {e}")

print(f"")
print(f"========================================")
print(f"  ✅ Batch complete!")
print(f"  📁 Outputs saved to: {output_dir}")
print(f"  ⏱️  Total time: {total_time/60:.1f} minutes")
print(f"========================================")
PYTHON
