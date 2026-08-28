# VHS Tape for EnvGuard Demo Recording
# Documentation: https://github.com/charmbracelet/vhs
#
# To re-generate demo.gif with VHS:
#   vhs demo.tape

Output assets/demo.gif

Set FontSize 14
Set FontFamily "Cascadia Code"
Set Width 920
Set Height 520
Set Padding 20
Set WindowBar Colorful
Set BorderRadius 10
Set Theme "TokyoNight"
Set TypingSpeed 40ms

# Step 1: Run EnvGuard scanner to detect drift, secret leaks, and type errors
Sleep 600ms
Type "npx envguard"
Sleep 400ms
Enter
Sleep 3.5s

# Step 2: Automatically synchronize .env.example with safe placeholders
Type "npx envguard sync"
Sleep 400ms
Enter
Sleep 2.5s

# Step 3: Re-run verification check — all clear!
Type "npx envguard"
Sleep 400ms
Enter
Sleep 3.5s
