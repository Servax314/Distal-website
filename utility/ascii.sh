#!/usr/bin/env bash
set -euo pipefail

# config

# match this to your source video bg
BACKGROUND_MODE="${BACKGROUND_MODE:-white}"

# char cell height correction
FONT_RATIO="${FONT_RATIO:-0.44}"

# tone mapping threshold (not hard bg removal)
LUMINANCE_THRESHOLD="${LUMINANCE_THRESHOLD:-30}"
# hard bg key; raise if bg leaks as letters
BG_KEY_THRESHOLD="${BG_KEY_THRESHOLD:-190}"

# ramps (bg is keyed separately, so no leading space needed)
ASCII_CHARS_BLACK=".'\`^,:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
# inverse ramp for white bg sources
ASCII_CHARS_WHITE="@\$B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|)(1}{][?-_+~<>i!lI;:,^\`\'."

# optional contrast boost
AUTO_LEVEL="${AUTO_LEVEL:-0}"

# video params
VIDEO_FORMATS=("mp4" "mkv" "mov" "avi")
OUTPUT_FPS="${OUTPUT_FPS:-20}"
OUTPUT_COLUMNS="${OUTPUT_COLUMNS:-200}"
# 0 => auto core count
PARALLEL_JOBS="${PARALLEL_JOBS:-0}"


default_parallel_jobs() {
    if command -v nproc >/dev/null 2>&1; then
        nproc
        return
    fi
    if command -v sysctl >/dev/null 2>&1; then
        sysctl -n hw.ncpu 2>/dev/null || true
        return
    fi
    echo 4
}

process_frame_to_ascii() {
    local frame_png="$1"
    local target_height="$2"
    local output_text_file="${frame_png%.png}.txt"

    local magick_cmd=(
        magick "$frame_png" -resize "x${target_height}!"
    )
    if (( AUTO_LEVEL == 1 )); then
        magick_cmd+=(-auto-level)
    fi
    magick_cmd+=(txt:-)

    "${magick_cmd[@]}" \
        | awk \
            -v mode="$BACKGROUND_MODE" \
            -v th="$LUMINANCE_THRESHOLD" \
            -v bgth="$BG_KEY_THRESHOLD" \
            -v charsB="$ASCII_CHARS_BLACK" \
            -v charsW="$ASCII_CHARS_WHITE" '
NR == 1 { next }
{
    row = $1
    sub(/.*,/, "", row)
    sub(/:.*/, "", row)
    row += 0

    if (last_row < 0) {
        last_row = row
    } else if (row != last_row) {
        printf "\n"
        last_row = row
    }

    r = g = b = 0
    if (index($0, "srgba(") || index($0, "srgb(")) {
        c = $0
        sub(/.*srgba?\(/, "", c)
        sub(/\).*/, "", c)
        nsplit = split(c, rgb, ",")
        if (nsplit >= 3) {
            r = rgb[1] + 0
            g = rgb[2] + 0
            b = rgb[3] + 0
        }
    } else if (index($0, "gray(")) {
        c = $0
        sub(/.*gray\(/, "", c)
        sub(/\).*/, "", c)
        r = c + 0
        g = r
        b = r
    } else {
        c = $0
        sub(/.*\(/, "", c)
        sub(/\).*/, "", c)
        nsplit = split(c, rgb, ",")
        if (nsplit >= 3) {
            r = rgb[1] + 0
            g = rgb[2] + 0
            b = rgb[3] + 0
        }
    }

    lum = int((2126 * r + 7152 * g + 722 * b) / 10000)

    ch = " "
    if (mode == "white") {
        white_cutoff = 255 - bgth
        if (lum < white_cutoff) {
            n = length(charsW)
            range = white_cutoff - 1
            if (range < 1) range = 1
            idx = int((lum * (n - 1)) / range) + 1
            if (idx < 1) idx = 1
            if (idx > n) idx = n
            ch = substr(charsW, idx, 1)
        }
    } else {
        if (lum > bgth) {
            n = length(charsB)
            vis_min = bgth + 1
            eff = lum - vis_min
            range = 255 - vis_min
            if (range < 1) range = 1
            idx = int((eff * (n - 1)) / range) + 1
            if (idx < 1) idx = 1
            if (idx > n) idx = n
            ch = substr(charsB, idx, 1)
        }
    }

    printf "%s", ch
}
END { printf "\n" }' > "$output_text_file"

    rm -f "$frame_png"
    echo "Processed ${frame_png##*/}"
}

generate_frame_images() {
    local video_file="$1"
    local working_dir="$2"
    local frame_images_dir="$working_dir/frame_images"
    mkdir -p "$frame_images_dir"

    echo "Extracting frames from '$video_file'..."
    ffmpeg \
        -loglevel error \
        -i "$video_file" \
        -vf "scale=$OUTPUT_COLUMNS:-2,fps=$OUTPUT_FPS" \
        "$frame_images_dir/frame_%04d.png"

    echo "Processing frames into ASCII..."
    local first_frame
    first_frame="$(find "$frame_images_dir" -name '*.png' | sort | head -n 1 || true)"
    if [[ -z "$first_frame" ]]; then
        echo "No frames extracted."
        return 1
    fi

    local image_height
    image_height=$(magick identify -ping -format '%h' "$first_frame")
    local new_height
    new_height=$(awk -v ratio="$FONT_RATIO" -v height="$image_height" 'BEGIN{print int(ratio * height + 0.5)}')

    local jobs="$PARALLEL_JOBS"
    if [[ ! "$jobs" =~ ^[0-9]+$ ]] || (( jobs < 0 )); then
        jobs=0
    fi
    if (( jobs == 0 )); then
        jobs="$(default_parallel_jobs)"
    fi
    if [[ ! "$jobs" =~ ^[0-9]+$ ]] || (( jobs < 1 )); then
        jobs=4
    fi
    echo "Using $jobs parallel jobs (new_height=$new_height)..."

    export BACKGROUND_MODE LUMINANCE_THRESHOLD BG_KEY_THRESHOLD ASCII_CHARS_BLACK ASCII_CHARS_WHITE AUTO_LEVEL
    export -f process_frame_to_ascii

    find "$frame_images_dir" -name '*.png' -print0 \
        | sort -z \
        | xargs -0 -I{} -P "$jobs" bash -euo pipefail -c 'process_frame_to_ascii "$1" "$2"' _ "{}" "$new_height"

    echo "ASCII generation complete."
}

video_to_terminal() {
    local video_file="${1:-}"
    if [[ -z "$video_file" ]]; then
        >&2 echo "Usage: $0 <video_file>"
        >&2 echo "Env: BACKGROUND_MODE=black|white  LUMINANCE_THRESHOLD=0..255  BG_KEY_THRESHOLD=0..255  AUTO_LEVEL=0|1"
        return 1
    fi
    if [[ ! -f "$video_file" ]]; then
        >&2 echo "Error: Input file '$video_file' does not exist."
        return 1
    fi

    if [[ "$BACKGROUND_MODE" != "black" && "$BACKGROUND_MODE" != "white" ]]; then
        >&2 echo "Error: BACKGROUND_MODE must be 'black' or 'white' (got '$BACKGROUND_MODE')."
        return 1
    fi
    if [[ ! "$LUMINANCE_THRESHOLD" =~ ^[0-9]+$ ]] || (( LUMINANCE_THRESHOLD < 0 || LUMINANCE_THRESHOLD > 255 )); then
        >&2 echo "Error: LUMINANCE_THRESHOLD must be an integer in [0,255] (got '$LUMINANCE_THRESHOLD')."
        return 1
    fi
    if [[ ! "$BG_KEY_THRESHOLD" =~ ^[0-9]+$ ]] || (( BG_KEY_THRESHOLD < 0 || BG_KEY_THRESHOLD > 255 )); then
        >&2 echo "Error: BG_KEY_THRESHOLD must be an integer in [0,255] (got '$BG_KEY_THRESHOLD')."
        return 1
    fi
    if [[ "$AUTO_LEVEL" != "0" && "$AUTO_LEVEL" != "1" ]]; then
        >&2 echo "Error: AUTO_LEVEL must be 0 or 1 (got '$AUTO_LEVEL')."
        return 1
    fi
    if [[ ! "$PARALLEL_JOBS" =~ ^[0-9]+$ ]] || (( PARALLEL_JOBS < 0 )); then
        >&2 echo "Error: PARALLEL_JOBS must be 0 or a positive integer (got '$PARALLEL_JOBS')."
        return 1
    fi
    if ! command -v ffmpeg >/dev/null 2>&1; then
        >&2 echo "Error: ffmpeg not found."
        return 1
    fi
    if ! command -v magick >/dev/null 2>&1; then
        >&2 echo "Error: ImageMagick (magick) not found."
        return 1
    fi

    local ext
    ext="$(echo "${video_file##*.}" | awk '{print tolower($0)}')"
    if [[ ! " ${VIDEO_FORMATS[*]} " =~ " ${ext} " ]]; then
        >&2 echo "Error: Unsupported file format '$ext'. Supported: ${VIDEO_FORMATS[*]}"
        return 1
    fi

    local working_dir="./ascii_frames_$(date +%s)"
    mkdir "$working_dir"
    echo "Created working directory: $working_dir"
    echo "Mode: BACKGROUND_MODE=$BACKGROUND_MODE, LUMINANCE_THRESHOLD=$LUMINANCE_THRESHOLD, BG_KEY_THRESHOLD=$BG_KEY_THRESHOLD, AUTO_LEVEL=$AUTO_LEVEL, PARALLEL_JOBS=$PARALLEL_JOBS"

    generate_frame_images "$video_file" "$working_dir"

    echo "Done. Output .txt frames are in '$working_dir/frame_images/'"
}

video_to_terminal "${1:-}"
