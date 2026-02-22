; Custom uninstall hook — remove autostart registry entry
!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "miniMe"
!macroend
