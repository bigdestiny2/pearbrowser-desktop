cmake_minimum_required(VERSION 4.0)

find_package(cmake-pear REQUIRED PATHS node_modules/cmake-pear)

project(pear_appling C CXX ASM)

add_pear_appling(
  pearbrowser_desktop
  ID "tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty"
  NAME "PearBrowser"
  VERSION 0.4.5
  AUTHOR "pearbrowser-desktop contributors"
  DESCRIPTION "P2P browser, app store, and publishing platform — no servers required."

  MACOS_IDENTIFIER com.pearbrowser.desktop
  MACOS_CATEGORY public.app-category.productivity

  LINUX_CATEGORY Network
)
