<?php
// Task 2: Reverse a string using strrev()

echo "Enter a string: ";
$input = rtrim(fgets(STDIN), "\r\n");
$reversed = strrev($input);

echo "\nOriginal string: $input\n";
echo "Reversed string: $reversed\n";
