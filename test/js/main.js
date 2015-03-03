var escaper = new Escaper();

test("Red: ", '[31mTest[0m');
test("Bold: ", '[1mTest[0m');
test("Blue bg: ", '[44mTest[0m');
test("Combo: ", '[31;44;1mTest[0m');
test("br: ", 'Te\nst');

function test(label, data) {
  $('#test').append("<p>")
            .append(label)
            .append(escaper.escape(data))
            .append("</p>");
}
