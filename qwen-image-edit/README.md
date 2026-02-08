# Qwen Image Edit - Sim-to-Real Style Transfer

Transform synthetic/CGI images into photorealistic versions while preserving spatial layout (weed positions, crop rows stay exactly where they are).

## Requirements

- macOS with Apple Silicon (M1 Max recommended)
- 64GB RAM (will work with 32GB but slower)
- ~30GB free disk space (for model download)
- Python 3.10+ (comes with macOS)

## Quick Start (5 minutes + download time)

### Step 1: Open Terminal

Press `Cmd + Space`, type "Terminal", hit Enter.

### Step 2: Download this folder

```bash
cd ~/Downloads
curl -L -o qwen-image-edit.zip "https://github.com/kennyklee/qwen-image-edit/archive/main.zip"
unzip qwen-image-edit.zip
cd qwen-image-edit-main
```

Or if you already have the folder, just `cd` into it.

### Step 3: Run Setup (one-time)

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Create a Python virtual environment
- Install all dependencies
- Download the model (~24GB, takes 10-30 min depending on internet)

### Step 4: Edit an image

```bash
./edit.sh your_image.png "photorealistic photograph, natural lighting"
```

Output saves to `outputs/` folder with timestamp.

## Usage Examples

**Basic sim-to-real:**
```bash
./edit.sh synthetic_field.png "photorealistic DSLR photograph, natural outdoor lighting"
```

**Weather variations:**
```bash
./edit.sh field.png "rainy weather, wet soil, overcast sky"
./edit.sh field.png "morning fog, soft diffused lighting"  
./edit.sh field.png "harsh midday sun, strong shadows"
```

**Soil variations:**
```bash
./edit.sh field.png "dark wet clumpy soil"
./edit.sh field.png "dry cracked earth, dusty"
./edit.sh field.png "soil with scattered hay debris"
```

## Batch Processing

Put all your input images in the `inputs/` folder, then:

```bash
./batch.sh "photorealistic photograph, natural lighting"
```

This processes all images in `inputs/` and saves to `outputs/`.

## Adjusting Strength

Edit `config.txt` to change:

- `GUIDANCE_SCALE=1.0` — How strongly to apply the prompt (1.0-1.5 = subtle, 2.0+ = stronger but may shift layout)
- `STEPS=4` — More steps = higher quality but slower

## Troubleshooting

**"MPS not available"** — Make sure you're on Apple Silicon Mac, not Intel.

**Out of memory** — Close other apps. The model needs ~24GB.

**Slow first run** — Normal. Model loads from disk first time, then stays in memory.

## Performance

- ~30-60 seconds per image on M1 Max
- First run slower (loading model)
- Batch of 100 images ≈ 1 hour
