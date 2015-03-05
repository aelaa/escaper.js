# escaper.js — Linux console escape sequences parser

escaper.js was implemented from part of [xterm.js](https://github.com/sourcelair/xterm.js) code.

## Using

You can use `Escaper` class to include parser to your terminal:

```
escaper = new Escaper();
```
Then you can use `escape` method:
```
escaper.escape("abcd\re")
```

### Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code to be distributed under the MIT license. You are also implicitly verifying that all code is your original work.

## License
Copyright (c) 2015, Ilya Shakirov (MIT License)

Copyright (c) 2014-2015, SourceLair, Ltd (www.sourcelair.com) (MIT License)

Copyright (c) 2012-2013, Christopher Jeffrey (MIT License)
