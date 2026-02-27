; Custom uninstall hook
!macro customUnInstall
  ; Remove autostart registry entry
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "miniMe"

  ; Safely remove project junctions BEFORE deleteAppDataOnUninstall kicks in.
  ; RMDir (without /r) removes a junction/symlink without following it —
  ; the target directory content stays untouched.
  FindFirst $0 $1 "$APPDATA\${APP_FILENAME}\workspace\projects\*.*"
  loop:
    StrCmp $1 "" done
    StrCmp $1 "." next
    StrCmp $1 ".." next
    RMDir "$APPDATA\${APP_FILENAME}\workspace\projects\$1"
  next:
    FindNext $0 $1
    Goto loop
  done:
    FindClose $0
!macroend
