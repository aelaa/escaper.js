// escaper.js: console escape sequences parser
// Based on https://github.com/sourcelair/xthis.js

function Escaper() {
  this.line = [];
  this.defAttr = (0 << 18) | (257 << 9) | (256 << 0);
  this.curAttr = this.defAttr;
};

var normal = 0, escaped = 1, csi = 2, osc = 3, charset = 4, dcs = 5, ignore = 6;

Escaper.prototype.escape = function(data) {
  var l = data.length, i = 0, ch
    , state = 0
    , savedX = 0
    , currentParam = 0
    , x = 0
    , params = [];
  this.line = [];

  for (; i < l; i++) {
    ch = data[i];
    switch (state) {
      case normal:
        switch (ch) {
        case '\r':
          x = 0;
        break;

        // '\b'
        case '\x08':
          if (x > 0) {
          x--;
        }
        break;

        // '\t'
        case '\t':
          x += 4;
        break;

        // '\e'
        case '\x1b':
          //ESC
          state = escaped;
        break;

        default:
          // ' '
          if (ch >= ' ' || ch == '\n') {
          this.line[x] = [this.curAttr, ch];
          x++;
        }
        break;
      }
      break;
      case escaped:
        switch (ch) {
        // ESC [ Control Sequence Introducer ( CSI is 0x9b).
        case '[':
          this.params = [];
        currentParam = 0;
        state = csi;
        break;

        // ESC ] Operating System Command ( OSC is 0x9d).
        case ']':
          this.params = [];
        currentParam = 0;
        state = osc;
        break;

        // ESC P Device Control String ( DCS is 0x90).
        case 'P':
          this.params = [];
        currentParam = 0;
        state = dcs;
        break;

        // ESC _ Application Program Command ( APC is 0x9f).
        case '_':
          case '^':
          state = ignore;
        break;

        // ESC c Full Reset (RIS).
        case 'c':
          this.line = [];
        break;

        // ESC E Next Line ( NEL is 0x85).
        // ESC D Index ( IND is 0x84).
        case 'E':
          x = 0;
        state = normal;
        break;

        // ESC 7 Save Cursor (DECSC).
        case '7':
          savedX = x;
        state = normal;
        break;

        // ESC 8 Restore Cursor (DECRC).
        case '8':
          x = savedX || 0;
        state = normal;
        break;

        default:
          state = normal;
        break;
      }
      break;

      case csi:
        if (ch === '?' || ch === '>' || ch === '!') {
        this.prefix = ch;
        break;
      }

      // 0 - 9
      if (ch >= '0' && ch <= '9') {
        currentParam = currentParam * 10 + ch.charCodeAt(0) - 48;
        break;
      }

      // '$', '"', ' ', '\''
      if (ch === '$' || ch === '"' || ch === ' ' || ch === '\'') {
        this.postfix = ch;
        break;
      }

      params.push(currentParam);
      currentParam = 0;

      // ';'
      if (ch === ';') break;

      state = normal;

      switch (ch) {
        // CSI Pm m  Character Attributes (SGR).
        case 'm':
          if (!this.prefix) {
          this.curAttr = this.charAttributes(params);
        }
        break;

        // CSI s
        //   Save cursor (ANSI.SYS).
        case 's':
          savedX = x;
        break;

        // CSI u
        //   Restore cursor (ANSI.SYS).
        case 'u':
          x = savedX || 0;
        break;

        default:
          this.prefix = '';
          this.postfix = '';
        break;

      };

      case osc:
      case dcs:
      case ignore:
        if (ch === '\x1b' || ch === '\x07') {
        if (ch === '\x1b') i++;
        currentParam = 0;
        state = normal;
      }
      break;

    };
  }

  // for (i=0;i<this.line.length;i++)
  // {
  //   out += this.line[i][1];
  // }
  x = 0;
  return this.refresh();
};

Escaper.prototype.refresh = function() {
  var line = this.line
    , out = ''
    , i = 0
    , attr = this.defAttr
    , ch, data, bg, fg, flags, row;

  for (; i < line.length; i++) {
    data = line[i][0];
    ch = line[i][1];

    if (data !== attr) {
      if (attr !== this.defAttr) {
        out += '</span>';
      }
      if (data !== this.defAttr) {
        out += '<span class="';

        bg = data & 0x1ff;
        fg = (data >> 9) & 0x1ff;
        flags = data >> 18;

        // bold
        if (flags & 1) {
          out += ' xterm-bold ';
          if (fg < 8) fg += 8;
        }

        // underline
        if (flags & 2) {
          out += ' xterm-underline ';
        }

        // blink
        if (flags & 4) {
          out += ' xterm-blink ';
        }

        // inverse
        if (flags & 8) {
          bg = (data >> 9) & 0x1ff;
          fg = data & 0x1ff;
          // Should inverse just be before the
          // above boldColors effect instead?
          if ((flags & 1) && fg < 8) fg += 8;
        }

        // invisible
        if (flags & 16) {
          out += ' xterm-hidden ';
        }

        if (bg !== 256) {
          out += ' xterm-bg-color-' + bg + ' ';
        }

        if (fg !== 257) {
          out += ' xterm-color-' + fg + ' ';
        }

        out += '">';
      }
    }

    switch (ch) {
      case '&':
        out += '&amp;';
      break;
      case '<':
        out += '&lt;';
      break;
      case '>':
        out += '&gt;';
      break;
      case '\n':
        out += '<br>';
      break;
      default:
        if (ch <= ' ') {
        // out += '&nbsp;';
      } else {
        if (isWide(ch)) i++;
        out += ch;
      }
      break;
    }

    attr = data;
  }

  if (attr !== this.defAttr) {
    out += '</span>';
  }

  return out;
};

Escaper.prototype.charAttributes = function(params) {
  // Optimize a single SGR0.
  if (params.length === 1 && params[0] === 0) {
    return this.defAttr;
  }

  var l = params.length
    , i = 0
    , flags = this.curAttr >> 18
    , fg = (this.curAttr >> 9) & 0x1ff
    , bg = this.curAttr & 0x1ff
    , p;

  for (; i < l; i++) {
    p = params[i];
    if (p >= 30 && p <= 37) {
      // fg color 8
      fg = p - 30;
    } else if (p >= 40 && p <= 47) {
      // bg color 8
      bg = p - 40;
    } else if (p >= 90 && p <= 97) {
      // fg color 16
      p += 8;
      fg = p - 90;
    } else if (p >= 100 && p <= 107) {
      // bg color 16
      p += 8;
      bg = p - 100;
    } else if (p === 0) {
      // default
      flags = this.defAttr >> 18;
      fg = (this.defAttr >> 9) & 0x1ff;
      bg = this.defAttr & 0x1ff;
      // flags = 0;
      // fg = 0x1ff;
      // bg = 0x1ff;
    } else if (p === 1) {
      // bold text
      flags |= 1;
    } else if (p === 4) {
      // underlined text
      flags |= 2;
    } else if (p === 5) {
      // blink
      flags |= 4;
    } else if (p === 7) {
      // inverse and positive
      // test with: echo -e '\e[31m\e[42mhello\e[7mworld\e[27mhi\e[m'
      flags |= 8;
    } else if (p === 8) {
      // invisible
      flags |= 16;
    } else if (p === 22) {
      // not bold
      flags &= ~1;
    } else if (p === 24) {
      // not underlined
      flags &= ~2;
    } else if (p === 25) {
      // not blink
      flags &= ~4;
    } else if (p === 27) {
      // not inverse
      flags &= ~8;
    } else if (p === 28) {
      // not invisible
      flags &= ~16;
    } else if (p === 39) {
      // reset fg
      fg = (this.defAttr >> 9) & 0x1ff;
    } else if (p === 49) {
      // reset bg
      bg = this.defAttr & 0x1ff;
    } else if (p === 38) {
      // fg color 256
      if (params[i + 1] === 2) {
        i += 2;
        fg = matchColor(
          params[i] & 0xff,
          params[i + 1] & 0xff,
          params[i + 2] & 0xff);
          if (fg === -1) fg = 0x1ff;
          i += 2;
      } else if (params[i + 1] === 5) {
        i += 2;
        p = params[i] & 0xff;
        fg = p;
      }
    } else if (p === 48) {
      // bg color 256
      if (params[i + 1] === 2) {
        i += 2;
        bg = matchColor(
          params[i] & 0xff,
          params[i + 1] & 0xff,
          params[i + 2] & 0xff);
          if (bg === -1) bg = 0x1ff;
          i += 2;
      } else if (params[i + 1] === 5) {
        i += 2;
        p = params[i] & 0xff;
        bg = p;
      }
    } else if (p === 100) {
      // reset fg/bg
      fg = (this.defAttr >> 9) & 0x1ff;
      bg = this.defAttr & 0x1ff;
    } else {
      this.error('Unknown SGR attribute: %d.', p);
    }
  }

  return (flags << 18) | (fg << 9) | bg;
};

function isWide(ch) {
  if (ch <= '\uff00') return false;
  return (ch >= '\uff01' && ch <= '\uffbe')
    || (ch >= '\uffc2' && ch <= '\uffc7')
      || (ch >= '\uffca' && ch <= '\uffcf')
        || (ch >= '\uffd2' && ch <= '\uffd7')
          || (ch >= '\uffda' && ch <= '\uffdc')
            || (ch >= '\uffe0' && ch <= '\uffe6')
              || (ch >= '\uffe8' && ch <= '\uffee');
};
