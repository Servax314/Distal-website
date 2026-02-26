#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---

# Terminal background mode: "black" or "white"
BACKGROUND_MODE="white"

# The ratio between the width and height of the font used for rendering.
FONT_RATIO="0.44"

# Background key threshold (0-255):
# - black mode: pixels darker than this -> space
# - white mode: pixels brighter than (255 - this) -> space
LUMINANCE_THRESHOLD=30

# Char ramps:
# - For black background: darkest -> lightest (spaces for dark)
ASCII_CHARS_BLACK=" .'\`^,:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
# - For white background: lightest -> darkest-ish (so dark pixels become dense chars)
#   (We keep a leading space conceptually via the keying step, not via the ramp.)
ASCII_CHARS_WHITE="@\$B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|)(1}{][?-_+~<>i!lI;:,^\`\'."

# Optional: enhance per-frame contrast before sampling pixels (0=off, 1=on)
AUTO_LEVEL=0

# Video processing settings
VIDEO_FORMATS=("mp4" "mkv" "mov" "avi")
OUTPUT_FPS=30
OUTPUT_COLUMNS=80

# --- Functions ---

pixel_for() {
    local r g b
    IFS=',' read -r r g b <<< "$1"

    # Relative luminance in [0..255]
    local lum
    lum=$(awk -v r="$r" -v g="$g" -v b="$b" 'BEGIN{print int(0.2126*r + 0.7152*g + 0.0722*b)}')

    if [[ "$BACKGROUND_MODE" == "white" ]]; then
        # White background: key out near-white pixels -> void
        local white_cutoff=$((255 - LUMINANCE_THRESHOLD))
        if (( lum >= white_cutoff )); then
            echo -n " "
            return
        fi

        # Map remaining [0 .. white_cutoff-1] where 0=black should be DENSE
        local chars="$ASCII_CHARS_WHITE"
        local n=${#chars}
        local range=$((white_cutoff))   # avoid -1; this is fine for mapping
        if (( range <= 0 )); then range=1; fi

        # darker (smaller lum) -> smaller index? No: we want black -> densest -> index 0 in ASCII_CHARS_WHITE
        # So use lum directly: 0 -> 0 (densest), white_cutoff -> last (lightest visible)
        local idx=$(( (lum * (n - 1)) / range ))
        if (( idx < 0 )); then idx=0; fi
        if (( idx >= n )); then idx=$((n - 1)); fi

        echo -n "${chars:$idx:1}"
        return
    fi

    # Black background: key out near-black pixels -> void
    if (( lum <= LUMINANCE_THRESHOLD )); then
        echo -n " "
        return
    fi

    # Map remaining [threshold .. 255] where brighter should be denser/brighter chars
    local chars="$ASCII_CHARS_BLACK"
    local n=${#chars}
    local eff=$((lum - LUMINANCE_THRESHOLD))
    local range=$((255 - LUMINANCE_THRESHOLD))
    if (( range <= 0 )); then range=1; fi

    local idx=$(( (eff * (n - 1)) / range ))
    if (( idx < 0 )); then idx=0; fi
    if (( idx >= n )); then idx=$((n - 1)); fi

    echo -n "${chars:$idx:1}"
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
    find "$frame_images_dir" -name '*.png' -print0 | sort -z | while IFS= read -r -d '' f; do
        local squished_image_file="${f%.png}_squished.png"
        local image_height
        image_height=$(magick identify -ping -format '%h' "$f")
        local new_height
        new_height=$(awk -v ratio="$FONT_RATIO" -v height="$image_height" 'BEGIN{print int(ratio * height + 0.5)}')

        magick "$f" -resize "x$new_height"'!' "$squished_image_file"

        if (( AUTO_LEVEL == 1 )); then
            magick "$squished_image_file" -auto-level "$squished_image_file"
        fi

        local imagemagick_text_file="${f%.png}_im.txt"
        local output_text_file="${f%.png}.txt"

        magick "$squished_image_file" "txt:$imagemagick_text_file"

        local last_row=-1
        : > "$output_text_file"

        tail -n +2 "$imagemagick_text_file" | while read -r line; do
            local xy_part="${line%% *}"
            local rgb_part="${line#*srgb(}"
            local rgb="${rgb_part%')'*}"
            local row="${xy_part#*,}"
            row="${row%:}"

            if [[ "$row" != "$last_row" ]]; then
                if (( last_row != -1 )); then
                    echo "" >> "$output_text_file"
                fi
                last_row=$row
            fi

            pixel_for "$rgb" >> "$output_text_file"
        done
        echo "" >> "$output_text_file"

        rm -f "$f" "$squished_image_file" "$imagemagick_text_file"
        echo "Processed ${f##*/}"
    done

    echo "ASCII generation complete."
}

video_to_terminal() {
    local video_file="${1:-}"
    if [[ -z "$video_file" ]]; then
        >&2 echo "Usage: $0 <video_file>"
        >&2 echo "Env: BACKGROUND_MODE=black|white  LUMINANCE_THRESHOLD=0..255  AUTO_LEVEL=0|1"
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

    local ext
    ext="$(echo "${video_file##*.}" | awk '{print tolower($0)}')"
    if [[ ! " ${VIDEO_FORMATS[*]} " =~ " ${ext} " ]]; then
        >&2 echo "Error: Unsupported file format '$ext'. Supported: ${VIDEO_FORMATS[*]}"
        return 1
    fi

    local working_dir="./ascii_frames_$(date +%s)"
    mkdir "$working_dir"
    echo "Created working directory: $working_dir"
    echo "Mode: BACKGROUND_MODE=$BACKGROUND_MODE, LUMINANCE_THRESHOLD=$LUMINANCE_THRESHOLD, AUTO_LEVEL=$AUTO_LEVEL"

    generate_frame_images "$video_file" "$working_dir"

    echo "Done. Output .txt frames are in '$working_dir/frame_images/'"
}

# --- Execution ---
video_to_terminal "${1:-}"