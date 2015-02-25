// escaper.js: console escape sequences parser
// Based on https://github.com/sourcelair/xterm.js

function Escaper() {
  this.state = 0;
};

var normal = 0, escaped = 1, csi = 2, osc = 3, charset = 4, dcs = 5, ignore = 6;

Escaper.prototype.escape = function(term, data) {
  var l = data.length, i = 0, j, cs, ch;

  for (; i < l; i++) {
    ch = data[i];
    switch (this.state) {
      case normal:
        // CONTROL CHARACTERS
        switch (ch) {
        // 0x07 BEL
        case '\x07':
          term.bell();
        break;

        // '\n', '\v', '\f'
        case '\n':
          case '\x0b':
          case '\x0c':
          if (term.convertEol) {
          term.x = 0;
        }
        //Add next line
        term.y++;
        //Do scroll if neccessary
        if (term.y > term.scrollBottom) {
          term.y--;
          term.scroll();
        }
        break;

        // '\r'
        case '\r':
          // CR
          term.x = 0;
        break;

        // '\b'
        case '\x08':
          // BS
          if (term.x > 0) {
          term.x--;
        }
        break;

        // '\t'
        case '\t':
          //TAB
          term.x = term.nextStop();
        break;

        // shift out
        case '\x0e':
          //SO
          term.setgLevel(1);
        break;

        // shift in
        case '\x0f':
          //SI
          term.setgLevel(0);
        break;

        // '\e'
        case '\x1b':
          //ESC
          this.state = escaped;
        break;

        default:
          // ' '
          if (ch >= ' ') {
          if (term.charset && term.charset[ch]) {
            ch = term.charset[ch];
          }

          if (term.x >= term.cols) {
            term.x = 0;
            term.y++;
            if (term.y > term.scrollBottom) {
              term.y--;
              term.scroll();
            }
          }

          term.lines[term.y + term.ybase][term.x] = [term.curAttr, ch];
          term.x++;
          term.updateRange(term.y);

          if (isWide(ch)) {
            j = term.y + term.ybase;
            if (term.cols < 2 || term.x >= term.cols) {
              term.lines[j][term.x - 1] = [term.curAttr, ' '];
              break;
            }
            term.lines[j][term.x] = [term.curAttr, ' '];
            term.x++;
          }
        }
        break;
      }
      break;
      case escaped:
        switch (ch) {
        // ESC [ Control Sequence Introducer ( CSI is 0x9b).
        case '[':
          term.params = [];
        term.currentParam = 0;
        this.state = csi;
        break;

        // ESC ] Operating System Command ( OSC is 0x9d).
        case ']':
          term.params = [];
        term.currentParam = 0;
        this.state = osc;
        break;

        // ESC P Device Control String ( DCS is 0x90).
        case 'P':
          term.params = [];
        term.currentParam = 0;
        this.state = dcs;
        break;

        // ESC _ Application Program Command ( APC is 0x9f).
        case '_':
         this.state = ignore;
        break;

        // ESC ^ Privacy Message ( PM is 0x9e).
        case '^':
          this.state = ignore;
        break;

        // ESC c Full Reset (RIS).
        case 'c':
          term.reset();
        break;

        // ESC E Next Line ( NEL is 0x85).
        // ESC D Index ( IND is 0x84).
        case 'E':
          term.x = 0;
        ;
        case 'D':
          term.index();
        break;

        // ESC M Reverse Index ( RI is 0x8d).
        case 'M':
          term.reverseIndex();
        break;

        // ESC % Select default/utf-8 character set.
        // @ = default, G = utf-8
        case '%':
          //term.charset = null;
          term.setgLevel(0);
        term.setgCharset(0, Escaper.charsets.US);
        this.state = normal;
        i++;
        break;

        // ESC (,),*,+,-,. Designate G0-G2 Character Set.
        case '(': // <-- term seems to get all the attention
          case ')':
          case '*':
          case '+':
          case '-':
          case '.':
          switch (ch) {
          case '(':
            term.gcharset = 0;
          break;
          case ')':
            term.gcharset = 1;
          break;
          case '*':
            term.gcharset = 2;
          break;
          case '+':
            term.gcharset = 3;
          break;
          case '-':
            term.gcharset = 1;
          break;
          case '.':
            term.gcharset = 2;
          break;
        }
        this.state = charset;
        break;

        // Designate G3 Character Set (VT300).
        // A = ISO Latin-1 Supplemental.
        // Not implemented.
        case '/':
          term.gcharset = 3;
        this.state = charset;
        i--;
        break;

        // ESC N
        // Single Shift Select of G2 Character Set
        // ( SS2 is 0x8e). term affects next character only.
        case 'N':
          break;
        // ESC O
        // Single Shift Select of G3 Character Set
        // ( SS3 is 0x8f). term affects next character only.
        case 'O':
          break;
        // ESC n
        // Invoke the G2 Character Set as GL (LS2).
        case 'n':
          term.setgLevel(2);
        break;
        // ESC o
        // Invoke the G3 Character Set as GL (LS3).
        case 'o':
          term.setgLevel(3);
        break;
        // ESC |
        // Invoke the G3 Character Set as GR (LS3R).
        case '|':
          term.setgLevel(3);
        break;
        // ESC }
        // Invoke the G2 Character Set as GR (LS2R).
        case '}':
          term.setgLevel(2);
        break;
        // ESC ~
        // Invoke the G1 Character Set as GR (LS1R).
        case '~':
          term.setgLevel(1);
        break;

        // ESC 7 Save Cursor (DECSC).
        case '7':
          term.saveCursor();
        this.state = normal;
        break;

        // ESC 8 Restore Cursor (DECRC).
        case '8':
          term.restoreCursor();
        this.state = normal;
        break;

        // ESC # 3 DEC line height/width
        case '#':
          this.state = normal;
        i++;
        break;

        // ESC H Tab Set (HTS is 0x88).
        case 'H':
          term.tabSet();
        break;

        // ESC = Application Keypad (DECPAM).
        case '=':
          term.log('Serial port requested application keypad.');
        term.applicationKeypad = true;
        this.state = normal;
        break;

        // ESC > Normal Keypad (DECPNM).
        case '>':
          term.log('Switching back to normal keypad.');
        term.applicationKeypad = false;
        this.state = normal;
        break;

        default:
          this.state = normal;
        term.error('Unknown ESC control: %s.', ch);
        break;
      }
      break;

      case charset:
        switch (ch) {
        case '0': // DEC Special Character and Line Drawing Set.
          cs = Escaper.charsets.SCLD;
        break;
        case 'A': // UK
          cs = Escaper.charsets.UK;
        break;
        case 'B': // United States (USASCII).
          cs = Escaper.charsets.US;
        break;
        case '4': // Dutch
          cs = Escaper.charsets.Dutch;
        break;
        case 'C': // Finnish
          case '5':
          cs = Escaper.charsets.Finnish;
        break;
        case 'R': // French
          cs = Escaper.charsets.French;
        break;
        case 'Q': // FrenchCanadian
          cs = Escaper.charsets.FrenchCanadian;
        break;
        case 'K': // German
          cs = Escaper.charsets.German;
        break;
        case 'Y': // Italian
          cs = Escaper.charsets.Italian;
        break;
        case 'E': // NorwegianDanish
          case '6':
          cs = Escaper.charsets.NorwegianDanish;
        break;
        case 'Z': // Spanish
          cs = Escaper.charsets.Spanish;
        break;
        case 'H': // Swedish
          case '7':
          cs = Escaper.charsets.Swedish;
        break;
        case '=': // Swiss
          cs = Escaper.charsets.Swiss;
        break;
        case '/': // ISOLatin (actually /A)
          cs = Escaper.charsets.ISOLatin;
        i++;
        break;
        default: // Default
          cs = Escaper.charsets.US;
        break;
      }
      term.setgCharset(term.gcharset, cs);
      term.gcharset = null;
      this.state = normal;
      break;

      case osc:
        // OSC Ps ; Pt ST
        // OSC Ps ; Pt BEL
        //   Set Text Parameters.
        if (ch === '\x1b' || ch === '\x07') {
        if (ch === '\x1b') i++;

        term.params.push(term.currentParam);

        switch (term.params[0]) {
          case 0:
            case 1:
            case 2:
            if (term.params[1]) {
            term.title = term.params[1];
            term.handleTitle(term.title);
          }
          break;
          case 3:
            // set X property
            break;
          case 4:
            case 5:
            // change dynamic colors
            break;
          case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
            // change dynamic ui colors
            break;
          case 46:
            // change log file
            break;
          case 50:
            // dynamic font
            break;
          case 51:
            // emacs shell
            break;
          case 52:
            // manipulate selection data
            break;
          case 104:
            case 105:
            case 110:
            case 111:
            case 112:
            case 113:
            case 114:
            case 115:
            case 116:
            case 117:
            case 118:
            // reset colors
            break;
        }

        term.params = [];
        term.currentParam = 0;
        this.state = normal;
      } else {
        if (!term.params.length) {
          if (ch >= '0' && ch <= '9') {
            term.currentParam =
              term.currentParam * 10 + ch.charCodeAt(0) - 48;
          } else if (ch === ';') {
            term.params.push(term.currentParam);
            term.currentParam = '';
          }
        } else {
          term.currentParam += ch;
        }
      }
      break;

      case csi:
        // '?', '>', '!'
        if (ch === '?' || ch === '>' || ch === '!') {
        term.prefix = ch;
        break;
      }

      // 0 - 9
      if (ch >= '0' && ch <= '9') {
        term.currentParam = term.currentParam * 10 + ch.charCodeAt(0) - 48;
        break;
      }

      // '$', '"', ' ', '\''
      if (ch === '$' || ch === '"' || ch === ' ' || ch === '\'') {
        term.postfix = ch;
        break;
      }

      term.params.push(term.currentParam);
      term.currentParam = 0;

      // ';'
      if (ch === ';') break;

      this.state = normal;

      switch (ch) {
        // CSI Ps A
        // Cursor Up Ps Times (default = 1) (CUU).
        case 'A':
          term.cursorUp(term.params);
        break;

        // CSI Ps B
        // Cursor Down Ps Times (default = 1) (CUD).
        case 'B':
          term.cursorDown(term.params);
        break;

        // CSI Ps C
        // Cursor Forward Ps Times (default = 1) (CUF).
        case 'C':
          term.cursorForward(term.params);
        break;

        // CSI Ps D
        // Cursor Backward Ps Times (default = 1) (CUB).
        case 'D':
          term.cursorBackward(term.params);
        break;

        // CSI Ps ; Ps H
        // Cursor Position [row;column] (default = [1,1]) (CUP).
        case 'H':
          term.cursorPos(term.params);
        break;

        // CSI Ps J  Erase in Display (ED).
        case 'J':
          term.eraseInDisplay(term.params);
        break;

        // CSI Ps K  Erase in Line (EL).
        case 'K':
          term.eraseInLine(term.params);
        break;

        // CSI Pm m  Character Attributes (SGR).
        case 'm':
          if (!term.prefix) {
          term.charAttributes(term.params);
        }
        break;

        // CSI Ps n  Device Status Report (DSR).
        case 'n':
          if (!term.prefix) {
          term.deviceStatus(term.params);
        }
        break;

        /**
         * Additions
         */

        // CSI Ps @
        // Insert Ps (Blank) Character(s) (default = 1) (ICH).
        case '@':
          term.insertChars(term.params);
        break;

        // CSI Ps E
        // Cursor Next Line Ps Times (default = 1) (CNL).
        case 'E':
          term.cursorNextLine(term.params);
        break;

        // CSI Ps F
        // Cursor Preceding Line Ps Times (default = 1) (CNL).
        case 'F':
          term.cursorPrecedingLine(term.params);
        break;

        // CSI Ps G
        // Cursor Character Absolute  [column] (default = [row,1]) (CHA).
        case 'G':
          term.cursorCharAbsolute(term.params);
        break;

        // CSI Ps L
        // Insert Ps Line(s) (default = 1) (IL).
        case 'L':
          term.insertLines(term.params);
        break;

        // CSI Ps M
        // Delete Ps Line(s) (default = 1) (DL).
        case 'M':
          term.deleteLines(term.params);
        break;

        // CSI Ps P
        // Delete Ps Character(s) (default = 1) (DCH).
        case 'P':
          term.deleteChars(term.params);
        break;

        // CSI Ps X
        // Erase Ps Character(s) (default = 1) (ECH).
        case 'X':
          term.eraseChars(term.params);
        break;

        // CSI Pm `  Character Position Absolute
        //   [column] (default = [row,1]) (HPA).
        case '`':
          term.charPosAbsolute(term.params);
        break;

        // 141 61 a * HPR -
        // Horizontal Position Relative
        case 'a':
          term.HPositionRelative(term.params);
        break;

        // CSI P s c
        // Send Device Attributes (Primary DA).
        // CSI > P s c
        // Send Device Attributes (Secondary DA)
        case 'c':
          term.sendDeviceAttributes(term.params);
        break;

        // CSI Pm d
        // Line Position Absolute  [row] (default = [1,column]) (VPA).
        case 'd':
          term.linePosAbsolute(term.params);
        break;

        // 145 65 e * VPR - Vertical Position Relative
        case 'e':
          term.VPositionRelative(term.params);
        break;

        // CSI Ps ; Ps f
        //   Horizontal and Vertical Position [row;column] (default =
        //   [1,1]) (HVP).
        case 'f':
          term.HVPosition(term.params);
        break;

        // CSI Pm h  Set Mode (SM).
        // CSI ? Pm h - mouse escape codes, cursor escape codes
        case 'h':
          term.setMode(term.params);
        break;

        // CSI Pm l  Reset Mode (RM).
        // CSI ? Pm l
        case 'l':
          term.resetMode(term.params);
        break;

        // CSI Ps ; Ps r
        //   Set Scrolling Region [top;bottom] (default = full size of win-
        //   dow) (DECSTBM).
        // CSI ? Pm r
        case 'r':
          term.setScrollRegion(term.params);
        break;

        // CSI s
        //   Save cursor (ANSI.SYS).
        case 's':
          term.saveCursor(term.params);
        break;

        // CSI u
        //   Restore cursor (ANSI.SYS).
        case 'u':
          term.restoreCursor(term.params);
        break;

        /**
         * Lesser Used
         */

        // CSI Ps I
        // Cursor Forward Tabulation Ps tab stops (default = 1) (CHT).
        case 'I':
          term.cursorForwardTab(term.params);
        break;

        // CSI Ps S  Scroll up Ps lines (default = 1) (SU).
        case 'S':
          term.scrollUp(term.params);
        break;

        // CSI Ps T  Scroll down Ps lines (default = 1) (SD).
        // CSI Ps ; Ps ; Ps ; Ps ; Ps T
        // CSI > Ps; Ps T
        case 'T':
          // if (term.prefix === '>') {
          //   term.resetTitleModes(term.params);
          //   break;
          // }
          // if (term.params.length > 2) {
          //   term.initMouseTracking(term.params);
          //   break;
          // }
          if (term.params.length < 2 && !term.prefix) {
          term.scrollDown(term.params);
        }
        break;

        // CSI Ps Z
        // Cursor Backward Tabulation Ps tab stops (default = 1) (CBT).
        case 'Z':
          term.cursorBackwardTab(term.params);
        break;

        // CSI Ps b  Repeat the preceding graphic character Ps times (REP).
        case 'b':
          term.repeatPrecedingCharacter(term.params);
        break;

        // CSI Ps g  Tab Clear (TBC).
        case 'g':
          term.tabClear(term.params);
        break;

        // CSI Pm i  Media Copy (MC).
        // CSI ? Pm i
        // case 'i':
        //   term.mediaCopy(term.params);
        //   break;

        // CSI Pm m  Character Attributes (SGR).
        // CSI > Ps; Ps m
        // case 'm': // duplicate
        //   if (term.prefix === '>') {
        //     term.setResources(term.params);
        //   } else {
        //     term.charAttributes(term.params);
        //   }
        //   break;

        // CSI Ps n  Device Status Report (DSR).
        // CSI > Ps n
        // case 'n': // duplicate
        //   if (term.prefix === '>') {
        //     term.disableModifiers(term.params);
        //   } else {
        //     term.deviceStatus(term.params);
        //   }
        //   break;

        // CSI > Ps p  Set pointer mode.
        // CSI ! p   Soft terminal reset (DECSTR).
        // CSI Ps$ p
        //   Request ANSI mode (DECRQM).
        // CSI ? Ps$ p
        //   Request DEC private mode (DECRQM).
        // CSI Ps ; Ps " p
        case 'p':
          switch (term.prefix) {
          // case '>':
          //   term.setPointerMode(term.params);
          //   break;
          case '!':
            term.softReset(term.params);
          break;
          // case '?':
          //   if (term.postfix === '$') {
          //     term.requestPrivateMode(term.params);
          //   }
          //   break;
          // default:
          //   if (term.postfix === '"') {
          //     term.setConformanceLevel(term.params);
          //   } else if (term.postfix === '$') {
          //     term.requestAnsiMode(term.params);
          //   }
          //   break;
        }
        break;

        // CSI Ps q  Load LEDs (DECLL).
        // CSI Ps SP q
        // CSI Ps " q
        // case 'q':
        //   if (term.postfix === ' ') {
        //     term.setCursorStyle(term.params);
        //     break;
        //   }
        //   if (term.postfix === '"') {
        //     term.setCharProtectionAttr(term.params);
        //     break;
        //   }
        //   term.loadLEDs(term.params);
        //   break;

        // CSI Ps ; Ps r
        //   Set Scrolling Region [top;bottom] (default = full size of win-
        //   dow) (DECSTBM).
        // CSI ? Pm r
        // CSI Pt; Pl; Pb; Pr; Ps$ r
        // case 'r': // duplicate
        //   if (term.prefix === '?') {
        //     term.restorePrivateValues(term.params);
        //   } else if (term.postfix === '$') {
        //     term.setAttrInRectangle(term.params);
        //   } else {
        //     term.setScrollRegion(term.params);
        //   }
        //   break;

        // CSI s     Save cursor (ANSI.SYS).
        // CSI ? Pm s
        // case 's': // duplicate
        //   if (term.prefix === '?') {
        //     term.savePrivateValues(term.params);
        //   } else {
        //     term.saveCursor(term.params);
        //   }
        //   break;

        // CSI Ps ; Ps ; Ps t
        // CSI Pt; Pl; Pb; Pr; Ps$ t
        // CSI > Ps; Ps t
        // CSI Ps SP t
        // case 't':
        //   if (term.postfix === '$') {
        //     term.reverseAttrInRectangle(term.params);
        //   } else if (term.postfix === ' ') {
        //     term.setWarningBellVolume(term.params);
        //   } else {
        //     if (term.prefix === '>') {
        //       term.setTitleModeFeature(term.params);
        //     } else {
        //       term.manipulateWindow(term.params);
        //     }
        //   }
        //   break;

        // CSI u     Restore cursor (ANSI.SYS).
        // CSI Ps SP u
        // case 'u': // duplicate
        //   if (term.postfix === ' ') {
        //     term.setMarginBellVolume(term.params);
        //   } else {
        //     term.restoreCursor(term.params);
        //   }
        //   break;

        // CSI Pt; Pl; Pb; Pr; Pp; Pt; Pl; Pp$ v
        // case 'v':
        //   if (term.postfix === '$') {
        //     term.copyRectagle(term.params);
        //   }
        //   break;

        // CSI Pt ; Pl ; Pb ; Pr ' w
        // case 'w':
        //   if (term.postfix === '\'') {
        //     term.enableFilterRectangle(term.params);
        //   }
        //   break;

        // CSI Ps x  Request Escaper Parameters (DECREQTPARM).
        // CSI Ps x  Select Attribute Change Extent (DECSACE).
        // CSI Pc; Pt; Pl; Pb; Pr$ x
        // case 'x':
        //   if (term.postfix === '$') {
        //     term.fillRectangle(term.params);
        //   } else {
        //     term.requestParameters(term.params);
        //     //term.__(term.params);
        //   }
        //   break;

        // CSI Ps ; Pu ' z
        // CSI Pt; Pl; Pb; Pr$ z
        // case 'z':
        //   if (term.postfix === '\'') {
        //     term.enableLocatorReporting(term.params);
        //   } else if (term.postfix === '$') {
        //     term.eraseRectangle(term.params);
        //   }
        //   break;

        // CSI Pm ' {
        // CSI Pt; Pl; Pb; Pr$ {
        // case '{':
        //   if (term.postfix === '\'') {
        //     term.setLocatorEvents(term.params);
        //   } else if (term.postfix === '$') {
        //     term.selectiveEraseRectangle(term.params);
        //   }
        //   break;

        // CSI Ps ' |
        // case '|':
        //   if (term.postfix === '\'') {
        //     term.requestLocatorPosition(term.params);
        //   }
        //   break;

        // CSI P m SP }
        // Insert P s Column(s) (default = 1) (DECIC), VT420 and up.
        // case '}':
        //   if (term.postfix === ' ') {
        //     term.insertColumns(term.params);
        //   }
        //   break;

        // CSI P m SP ~
        // Delete P s Column(s) (default = 1) (DECDC), VT420 and up
        // case '~':
        //   if (term.postfix === ' ') {
        //     term.deleteColumns(term.params);
        //   }
        //   break;

        default:
          term.error('Unknown CSI code: %s.', ch);
        break;
      }

      term.prefix = '';
      term.postfix = '';
      break;

      case dcs:
        if (ch === '\x1b' || ch === '\x07') {
        if (ch === '\x1b') i++;

        switch (term.prefix) {
          // User-Defined Keys (DECUDK).
          case '':
            break;

          // Request Status String (DECRQSS).
          // test: echo -e '\eP$q"p\e\\'
          case '$q':
            var pt = term.currentParam
              , valid = false;

            switch (pt) {
              // DECSCA
              case '"q':
                pt = '0"q';
              break;

              // DECSCL
              case '"p':
                pt = '61"p';
              break;

              // DECSTBM
              case 'r':
                pt = ''
              + (term.scrollTop + 1)
              + ';'
              + (term.scrollBottom + 1)
              + 'r';
              break;

              // SGR
              case 'm':
                pt = '0m';
              break;

              default:
                term.error('Unknown DCS Pt: %s.', pt);
              pt = '';
              break;
            }

            term.send('\x1bP' + +valid + '$r' + pt + '\x1b\\');
            break;

            // Set Termcap/Terminfo Data (xterm, experimental).
            case '+p':
              break;

            // Request Termcap/Terminfo String (xterm, experimental)
            // Regular xterm does not even respond to term sequence.
            // term can cause a small glitch in vim.
            // test: echo -ne '\eP+q6b64\e\\'
            case '+q':
              var pt = term.currentParam
                , valid = false;

              term.send('\x1bP' + +valid + '+r' + pt + '\x1b\\');
              break;

              default:
                term.error('Unknown DCS prefix: %s.', term.prefix);
              break;
        }

        term.currentParam = 0;
        term.prefix = '';
        this.state = normal;
      } else if (!term.currentParam) {
        if (!term.prefix && ch !== '$' && ch !== '+') {
          term.currentParam = ch;
        } else if (term.prefix.length === 2) {
          term.currentParam = ch;
        } else {
          term.prefix += ch;
        }
      } else {
        term.currentParam += ch;
      }
      break;

      case ignore:
        // For PM and APC.
        if (ch === '\x1b' || ch === '\x07') {
        if (ch === '\x1b') i++;
        this.state = normal;
      }
      break;
    };
  };
};

function keys(obj) {
  if (Object.keys) return Object.keys(obj);
  var key, keys = [];
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      keys.push(key);
    }
  }
  return keys;
}

function each(obj, iter, con) {
  if (obj.forEach) return obj.forEach(iter, con);
  for (var i = 0; i < obj.length; i++) {
    iter.call(con, obj[i], i, obj);
  }
}

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
