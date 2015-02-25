# escaper.js — Linux console escape sequences parser

escaper.js was implemented from part of [xterm.js](https://github.com/sourcelair/xterm.js) code.

## Using

You can use `Escaper` class to include parser to your terminal:

```
escaper = new Escaper();
term = new Terminal({escaper: escaper});
```
Then you can use `escape` method:
```
escaper.escape(term, "data")
```

Your terminal should have realization of all terminal-using methods. List of all required methods is in `docs/METHODS.md` file.

### Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code to be distributed under the MIT license. You are also implicitly verifying that all code is your original work.

## License
Copyright (c) 2015, Ilya Shakirov (MIT License)

Copyright (c) 2014-2015, SourceLair, Ltd (www.sourcelair.com) (MIT License)

Copyright (c) 2012-2013, Christopher Jeffrey (MIT License)
