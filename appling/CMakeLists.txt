cmake_minimum_required(VERSION 4.0)

find_package(cmake-pear REQUIRED PATHS node_modules/cmake-pear)

project(pear_appling C CXX ASM)

set(PEARBROWSER_APPLING_DIR "${CMAKE_CURRENT_LIST_DIR}")
set(PEARBROWSER_BARE_HEADERS_VERSION "1.28.7" CACHE STRING "Bare headers version compatible with cmake-pear's pinned Bare runtime")
set(PEARBROWSER_MACOS_ICNS "${PEARBROWSER_APPLING_DIR}/assets/darwin/icon.icns")
set(PEARBROWSER_LINUX_METAINFO "${PEARBROWSER_APPLING_DIR}/assets/linux/io.github.bigdestiny2.pearbrowser.metainfo.xml")

if(NOT DEFINED PEARBROWSER_MACOS_SIGNING_IDENTITY)
  if(DEFINED ENV{PEARBROWSER_MACOS_SIGNING_IDENTITY} AND NOT "$ENV{PEARBROWSER_MACOS_SIGNING_IDENTITY}" STREQUAL "")
    set(PEARBROWSER_MACOS_SIGNING_IDENTITY "$ENV{PEARBROWSER_MACOS_SIGNING_IDENTITY}" CACHE STRING "macOS codesign identity; '-' means ad-hoc signing")
  else()
    set(PEARBROWSER_MACOS_SIGNING_IDENTITY "-" CACHE STRING "macOS codesign identity; '-' means ad-hoc signing")
  endif()
endif()

if(NOT DEFINED PEARBROWSER_MACOS_SIGNING_KEYCHAIN)
  if(DEFINED ENV{PEARBROWSER_MACOS_SIGNING_KEYCHAIN})
    set(PEARBROWSER_MACOS_SIGNING_KEYCHAIN "$ENV{PEARBROWSER_MACOS_SIGNING_KEYCHAIN}" CACHE STRING "Optional macOS keychain for release signing")
  else()
    set(PEARBROWSER_MACOS_SIGNING_KEYCHAIN "" CACHE STRING "Optional macOS keychain for release signing")
  endif()
endif()

if(NOT DEFINED PEARBROWSER_WINDOWS_SIGNING_SUBJECT)
  if(DEFINED ENV{PEARBROWSER_WINDOWS_SIGNING_SUBJECT} AND NOT "$ENV{PEARBROWSER_WINDOWS_SIGNING_SUBJECT}" STREQUAL "")
    set(PEARBROWSER_WINDOWS_SIGNING_SUBJECT "$ENV{PEARBROWSER_WINDOWS_SIGNING_SUBJECT}" CACHE STRING "Windows MSIX publisher subject")
  else()
    set(PEARBROWSER_WINDOWS_SIGNING_SUBJECT "CN=PearBrowser Desktop" CACHE STRING "Windows MSIX publisher subject")
  endif()
endif()

if(NOT DEFINED PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT)
  if(DEFINED ENV{PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT})
    set(PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT "$ENV{PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT}" CACHE STRING "Optional Windows signing certificate thumbprint")
  else()
    set(PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT "" CACHE STRING "Optional Windows signing certificate thumbprint")
  endif()
endif()

# cmake-bare defaults native addon headers to the npm "latest" tag. Keep
# PearBrowser builds reproducible by resolving the lockfile-owned copy instead.
function(download_bare_headers result)
  set(one_value_keywords
    DESTINATION
    VERSION
  )

  cmake_parse_arguments(
    PARSE_ARGV 1 ARGV "" "${one_value_keywords}" ""
  )

  if(ARGV_VERSION)
    set(expected_version "${ARGV_VERSION}")
  else()
    set(expected_version "${PEARBROWSER_BARE_HEADERS_VERSION}")
  endif()

  resolve_node_module(
    bare-headers
    output
    WORKING_DIRECTORY "${PEARBROWSER_APPLING_DIR}"
  )

  if("${output}" MATCHES "NOTFOUND")
    message(FATAL_ERROR "bare-headers is missing. Run npm ci --prefix appling.")
  endif()

  file(READ "${output}/package.json" bare_headers_package)
  string(JSON resolved_version GET "${bare_headers_package}" "version")

  if(NOT resolved_version STREQUAL expected_version)
    message(FATAL_ERROR "bare-headers ${resolved_version} does not match expected ${expected_version}. Run npm ci --prefix appling.")
  endif()

  cmake_path(APPEND output include OUTPUT_VARIABLE include_dir)

  set(${result} "${include_dir}")

  return(PROPAGATE ${result})
endfunction()

# cmake-pear passes a single 1024px macOS icon and then invokes iconutil. Prefer
# the committed ICNS; keep generated iconset support as a local fallback.
function(add_macos_iconset target)
  set(one_value_keywords
    DESTINATION
  )

  set(multi_value_keywords
    ICONS
    DEPENDS
  )

  cmake_parse_arguments(
    PARSE_ARGV 1 ARGV "" "${one_value_keywords}" "${multi_value_keywords}"
  )

  if(NOT ARGV_DESTINATION)
    set(ARGV_DESTINATION icon.icns)
  endif()

  cmake_path(ABSOLUTE_PATH ARGV_DESTINATION BASE_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}" NORMALIZE)

  if(EXISTS "${PEARBROWSER_MACOS_ICNS}")
    add_custom_target(
      ${target}
      ALL
      COMMAND ${CMAKE_COMMAND} -E copy_if_different "${PEARBROWSER_MACOS_ICNS}" "${ARGV_DESTINATION}"
      DEPENDS "${PEARBROWSER_MACOS_ICNS}" ${ARGV_DEPENDS}
    )

    return()
  endif()

  list(LENGTH ARGV_ICONS icons_len)

  if(icons_len LESS 1)
    message(FATAL_ERROR "add_macos_iconset requires at least one source icon")
  endif()

  list(GET ARGV_ICONS 0 source_icon)

  cmake_path(ABSOLUTE_PATH source_icon NORMALIZE)
  cmake_path(GET ARGV_DESTINATION STEM stem)

  find_program(sips NAMES sips REQUIRED)
  find_iconutil(iconutil)

  set(iconset "${CMAKE_CURRENT_BINARY_DIR}/${stem}.iconset")

  add_custom_target(
    ${target}
    ALL
    COMMAND ${CMAKE_COMMAND} -E make_directory "${iconset}"
    COMMAND ${sips} -z 16 16 "${source_icon}" --out "${iconset}/icon_16x16.png"
    COMMAND ${sips} -z 32 32 "${source_icon}" --out "${iconset}/icon_16x16@2x.png"
    COMMAND ${sips} -z 32 32 "${source_icon}" --out "${iconset}/icon_32x32.png"
    COMMAND ${sips} -z 64 64 "${source_icon}" --out "${iconset}/icon_32x32@2x.png"
    COMMAND ${sips} -z 128 128 "${source_icon}" --out "${iconset}/icon_128x128.png"
    COMMAND ${sips} -z 256 256 "${source_icon}" --out "${iconset}/icon_128x128@2x.png"
    COMMAND ${sips} -z 256 256 "${source_icon}" --out "${iconset}/icon_256x256.png"
    COMMAND ${sips} -z 512 512 "${source_icon}" --out "${iconset}/icon_256x256@2x.png"
    COMMAND ${sips} -z 512 512 "${source_icon}" --out "${iconset}/icon_512x512.png"
    COMMAND ${sips} -z 1024 1024 "${source_icon}" --out "${iconset}/icon_512x512@2x.png"
    COMMAND ${iconutil} --convert icns --output "${ARGV_DESTINATION}" "${iconset}"
    DEPENDS ${source_icon} ${ARGV_DEPENDS}
  )
endfunction()

# Default local and CI builds to ad-hoc signing. Release builds can pass a real
# Developer ID identity through PEARBROWSER_MACOS_SIGNING_IDENTITY.
function(code_sign_macos target)
  set(one_value_keywords
    PATH
    TARGET
    ENTITLEMENTS
    IDENTITY
    KEYCHAIN
  )

  set(multi_value_keywords
    DEPENDS
  )

  cmake_parse_arguments(
    PARSE_ARGV 1 ARGV "" "${one_value_keywords}" "${multi_value_keywords}"
  )

  if(ARGV_TARGET)
    set(ARGV_PATH $<TARGET_FILE:${ARGV_TARGET}>)
    set(base $<TARGET_FILE_DIR:${ARGV_TARGET}>)
  else()
    cmake_path(ABSOLUTE_PATH ARGV_PATH NORMALIZE)
    cmake_path(GET ARGV_PATH PARENT_PATH base)
  endif()

  if(NOT ARGV_IDENTITY)
    set(ARGV_IDENTITY "${PEARBROWSER_MACOS_SIGNING_IDENTITY}")
  endif()

  if(NOT ARGV_KEYCHAIN)
    set(ARGV_KEYCHAIN "${PEARBROWSER_MACOS_SIGNING_KEYCHAIN}")
  endif()

  if(ARGV_ENTITLEMENTS)
    cmake_path(ABSOLUTE_PATH ARGV_ENTITLEMENTS NORMALIZE)
  else()
    cmake_path(APPEND base "Entitlements.plist" OUTPUT_VARIABLE ARGV_ENTITLEMENTS)
  endif()

  set(args
    --force
    --options runtime
    --entitlements "${ARGV_ENTITLEMENTS}"
    --sign "${ARGV_IDENTITY}"
  )

  if(NOT ARGV_IDENTITY STREQUAL "-")
    list(PREPEND args --timestamp)
  endif()

  if(ARGV_KEYCHAIN)
    list(APPEND args --keychain "${ARGV_KEYCHAIN}")
  endif()

  find_codesign(codesign)

  add_custom_target(
    ${target}
    ALL
    COMMAND ${codesign} ${args} "${ARGV_PATH}"
    DEPENDS ${ARGV_DEPENDS}
  )
endfunction()

# Keep Windows CI useful before release certificates exist. An unsigned MSIX is
# enough to prove packaging; a real thumbprint turns SignTool signing back on.
function(code_sign_windows target)
  set(one_value_keywords
    PATH
    TARGET
    SUBJECT_NAME
    THUMBPRINT
    TIMESTAMP
  )

  set(multi_value_keywords
    DEPENDS
  )

  cmake_parse_arguments(
    PARSE_ARGV 1 ARGV "" "${one_value_keywords}" "${multi_value_keywords}"
  )

  if(ARGV_TARGET)
    set(ARGV_PATH $<TARGET_FILE:${ARGV_TARGET}>)
    list(APPEND ARGV_DEPENDS ${ARGV_TARGET})
  else()
    cmake_path(ABSOLUTE_PATH ARGV_PATH NORMALIZE)
  endif()

  if(NOT ARGV_SUBJECT_NAME)
    set(ARGV_SUBJECT_NAME "${PEARBROWSER_WINDOWS_SIGNING_SUBJECT}")
  endif()

  if(NOT ARGV_THUMBPRINT)
    set(ARGV_THUMBPRINT "${PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT}")
  endif()

  if(NOT ARGV_THUMBPRINT)
    add_custom_target(
      ${target}
      ALL
      COMMAND ${CMAKE_COMMAND} -E echo "Skipping Windows code signing for ${ARGV_PATH}; set PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT for signed MSIX releases."
      DEPENDS ${ARGV_DEPENDS}
    )

    return()
  endif()

  if(NOT ARGV_TIMESTAMP)
    set(ARGV_TIMESTAMP "http://timestamp.digicert.com")
  endif()

  set(args
    /sha1 "${ARGV_THUMBPRINT}"
    /fd SHA256
    /t "${ARGV_TIMESTAMP}"
  )

  find_sign_tool(sign_tool)

  add_custom_target(
    ${target}
    ALL
    COMMAND ${sign_tool} sign ${args} "${ARGV_PATH}"
    DEPENDS ${ARGV_DEPENDS}
  )
endfunction()

# cmake-pear delegates Linux packaging to cmake-app-image, which generates the
# desktop entry from CMake arguments. Add PearBrowser's AppStream metainfo to the
# generated AppDir so Linux release artifacts can be metadata-checked before
# upload.
function(configure_pear_appling_linux target)
  set(one_value_keywords
    NAME
    DESCRIPTION
    ICON
    CATEGORY
    SPLASH
  )

  cmake_parse_arguments(
    PARSE_ARGV 1 ARGV "" "${one_value_keywords}" ""
  )

  if(NOT ARGV_ICON)
    set(ARGV_ICON "assets/linux/icon.png")
  endif()

  string(TOLOWER "${ARGV_NAME}" ARGV_OUTPUT_NAME)

  set_target_properties(
    ${target}
    PROPERTIES
    OUTPUT_NAME "${ARGV_OUTPUT_NAME}"
  )

  if(NOT EXISTS "${PEARBROWSER_LINUX_METAINFO}")
    message(FATAL_ERROR "PearBrowser Linux AppStream metadata is missing: ${PEARBROWSER_LINUX_METAINFO}")
  endif()

  add_app_image(
    ${target}_app_image
    NAME "${ARGV_NAME}"
    DESCRIPTION "${ARGV_DESCRIPTION}"
    ICON "${ARGV_ICON}"
    CATEGORY "${ARGV_CATEGORY}"
    TARGET ${target}
    RESOURCES
      FILE "${ARGV_SPLASH}" "splash.png"
      FILE "${PEARBROWSER_LINUX_METAINFO}" "usr/share/metainfo/io.github.bigdestiny2.pearbrowser.metainfo.xml"
  )
endfunction()

add_pear_appling(
  pearbrowser_desktop
  ID "tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty"
  NAME "PearBrowser"
  VERSION 0.5.1
  AUTHOR "pearbrowser-desktop contributors"
  DESCRIPTION "P2P browser, app store, and publishing platform — no servers required."

  MACOS_IDENTIFIER com.pearbrowser.desktop
  MACOS_CATEGORY public.app-category.productivity
  MACOS_SIGNING_IDENTITY "${PEARBROWSER_MACOS_SIGNING_IDENTITY}"
  MACOS_SIGNING_KEYCHAIN "${PEARBROWSER_MACOS_SIGNING_KEYCHAIN}"

  WINDOWS_SIGNING_SUBJECT "${PEARBROWSER_WINDOWS_SIGNING_SUBJECT}"
  WINDOWS_SIGNING_THUMBPRINT "${PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT}"

  LINUX_CATEGORY Network
)
