!macro customUnInstall
  MessageBox MB_YESNO "Do you want to delete all SCMUI card library images, plugins, and saved projects? Select NO to keep your library and settings." IDNO label_skip_deletion
  RMDir /r "$APPDATA\SCMUI"
  Goto label_done
  label_skip_deletion:
  RMDir /r "$APPDATA\SCMUI\src\projects"
  RMDir /r "$APPDATA\SCMUI\src\silhouette-card-maker-main"
  RMDir /r "$APPDATA\SCMUI\uploads"
  RMDir /r "$APPDATA\SCMUI\temp-uploads"
  RMDir /r "$APPDATA\SCMUI\.trash"
  Delete "$APPDATA\SCMUI\src\*.*"
  label_done:
!macroend
