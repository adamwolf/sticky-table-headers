ffmpeg -i sticky-table-headers-example.mov -vf "fps=10,palettegen" palette.png
ffmpeg -i sticky-table-headers-example.mov -i palette.png -filter_complex "fps=10,scale=800:-1,paletteuse" output.gif
gifsicle -O3 --lossy output.gif -o final.gif
