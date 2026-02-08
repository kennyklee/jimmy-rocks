#!/bin/bash
set -e

echo "=========================================="
echo "  Qwen Image Edit - Setup Script"
echo "=========================================="
echo ""

# Check for Apple Silicon
if [[ $(uname -m) != "arm64" ]]; then
    echo "⚠️  Warning: This script is optimized for Apple Silicon Macs."
    echo "   Intel Macs may not work well."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check Python
echo "📍 Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install it first:"
    echo "   brew install python3"
    exit 1
fi
echo "✅ Python 3 found: $(python3 --version)"

# Create directories
echo ""
echo "📁 Creating directories..."
mkdir -p inputs outputs

# Create virtual environment
echo ""
echo "🐍 Creating Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate and install dependencies
echo ""
echo "📦 Installing dependencies (this may take a few minutes)..."
source venv/bin/activate

pip install --upgrade pip
pip install torch torchvision
pip install diffusers transformers accelerate sentencepiece protobuf
pip install pillow

echo "✅ Dependencies installed"

# Create config file
echo ""
echo "⚙️  Creating config file..."
cat > config.txt << 'EOF'
# Qwen Image Edit Configuration
# Edit these values to adjust behavior

# Guidance scale: how strongly to follow the prompt
# 1.0-1.5 = subtle, preserves layout best
# 2.0+ = stronger effect, may shift things
GUIDANCE_SCALE=1.0

# Number of inference steps
# 4 = fast (default with Lightning LoRA)
# 8-10 = higher quality, slower
STEPS=4
EOF
echo "✅ Config file created"

# Download model (this is the big one)
echo ""
echo "📥 Pre-downloading model weights (~24GB)..."
echo "   This will take 10-30 minutes depending on your internet."
echo ""

python3 << 'PYTHON'
import torch
from diffusers import QwenImageEditPlusPipeline

print("Downloading main model...")
pipe = QwenImageEditPlusPipeline.from_pretrained(
    "Qwen/Qwen-Image-Edit-2511",
    torch_dtype=torch.float32
)

print("Downloading Lightning LoRA...")
pipe.load_lora_weights(
    "lightx2v/Qwen-Image-Edit-2511-Lightning",
    weight_name="Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors"
)

print("✅ Model downloaded and cached!")
PYTHON

echo ""
echo "=========================================="
echo "  ✅ Setup Complete!"
echo "=========================================="
echo ""
echo "To edit an image, run:"
echo "  ./edit.sh your_image.png \"your prompt here\""
echo ""
echo "Example:"
echo "  ./edit.sh test.png \"photorealistic photograph, natural lighting\""
echo ""
