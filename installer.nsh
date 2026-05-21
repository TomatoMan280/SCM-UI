!macro customUnInstall
  MessageBox MB_YESNO "Do you want to delete all SCMUI card library images, plugins, and saved projects? Select NO to keep your library and settings." IDNO label_skip_deletion
  RMDir /r "$APPDATA\SCMUI"
  label_skip_deletion:
!macroend
