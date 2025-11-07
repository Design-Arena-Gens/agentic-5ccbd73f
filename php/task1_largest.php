<?php
// Task 1: Largest of three numbers using nested if

function read_number($prompt) {
    echo $prompt;
    $line = trim(fgets(STDIN));
    if (!is_numeric($line)) {
        echo "Invalid input. Please enter a number.\n";
        exit(1);
    }
    return $line + 0; // cast to number
}

$a = read_number("Enter first number: ");
$b = read_number("Enter second number: ");
$c = read_number("Enter third number: ");

// Nested if approach
$largest = $a; // default assumption
if ($a >= $b) {
    if ($a >= $c) {
        $largest = $a;
    } else {
        $largest = $c;
    }
} else {
    if ($b >= $c) {
        $largest = $b;
    } else {
        $largest = $c;
    }
}

echo "\nNumbers: $a, $b, $c\n";
echo "Largest number: $largest\n";
