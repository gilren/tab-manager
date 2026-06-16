#include <cjson/cJSON.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

int get_message(char *buffer, size_t buffer_size, uint32_t *out_length);
int send_message(const char *response);
int handle_message(const char *message, char *response, size_t response_size);

int main(void) {
  // Loop here allows us to read multiple msg, upon connectNative from the
  // extension firefox keeps the stdin stream open, which makes fread inside
  // get_message(), block the thread.
  while (1) {
    char message[32768];
    char response[4096];
    uint32_t length;

    int status = get_message(message, sizeof(message), &length);

    if (status != 0) {
      fprintf(stderr, "Failed to read message\n");
      break;
    }

    handle_message(message, response, sizeof(response));
    send_message(response);
  }
  return 0;
}

int get_message(char *buffer, size_t buffer_size, uint32_t *out_length) {
  uint32_t length;

  // first 4 bytes are the length of the message
  if (fread(&length, 4, 1, stdin) != 1) {
    fprintf(stderr, "Error: could not read message length\n");
    return 1;
  }

  if (length >= buffer_size) {
    fprintf(stderr, "Error: message too large\n");
    return 1;
  }

  size_t read_len = fread(buffer, 1, length, stdin);

  if (read_len < length) {
    fprintf(stderr, "Error: expected %u bytes, got %zu\n", length, read_len);
    return 1;
  }

  buffer[length] = '\0';
  *out_length = length;
  return 0;
}

int send_message(const char *response) {

  response = "{\"message\": \"test msgaw\"}";
  uint32_t response_length = strlen(response);
  //
  // fprintf(stderr, "Answer length is: %u\n", response_length);
  // fprintf(stderr, "Answer is: %s\n", response);
  fwrite(&response_length, 4, 1, stdout);
  fwrite(response, 1, response_length, stdout);
  fflush(stdout);

  return 1;
}

int handle_message(const char *message, char *response, size_t response_size) {
  cJSON *json = cJSON_Parse(message);
  char *string = cJSON_Print(json);

  if (string == NULL) {
    fprintf(stderr, "Failed to print message.\n");
  }

  // fprintf(stderr, "%s\n", string);
  return 1;
}

// TODO: Handle first load, write window screen location into file, send
// commands to wayland for window pos

// TODO: listen to event like listTabs, moveTab, closeTab from native and
// translates to browser.tabs.* API call
//
// TODO: - Exposes CLI subcommands like:
//       - `tab-mcp list-tabs`
//       - `tab-mcp move-tab <tabId> --window <id> --index <n>`
//       - tab-mcp move-tab '[
//         {"tabId":1,"window":1,"index":0},
//         {"tabId":2,"window":1,"index":2}
//         ]'
//       - `tab-mcp close-tab <tabId>`
//       - `sort-window` for the on load
//
//      paths: `~/.mozilla/native-messaging-hosts/`, registry, plist)
//
// TODO: Integration with pi
//    - Either a **skill** (`SKILL.md` documenting the CLI commands) —
//      pi calls them via `bash`
//    - Or a **pi extension** (`.pi/extensions/tab-manager.ts`) that
//      registers `list_tabs` / `move_tab` as native pi tools via
//      `pi.registerTool()`, each shelling out to the CLI
//
