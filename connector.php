<?php

use Joomla\Input\Input;
use Symfony\Component\Finder\Finder;

require 'vendor/autoload.php';

$input = new Input();
$finder = new Finder();
$rows = array();

$path = ltrim($input->getString('path'), './');
$basePath = 'files' . ($path ? '/' . $path : '');

$rows['status']['requestPath'] = $path;
$rows['status']['basePath'] = $basePath;
$rows['status']['dirname'] = dirname($path) === '.' ? '' : dirname($path);
$rows['status']['realpath'] = realpath($basePath);
$rows['status']['isDir'] = is_dir($basePath);
$rows['status']['isFile'] = is_file($basePath);

try {
    $finder->depth('== 0')->in($basePath)->sortByType();
    $rows['status']['itemCount'] = $finder->count();

    foreach ($finder as $item) {
        if ($item->isDir()) {
            $rows['directories'][] = $item->getFilename();
        } else {
            $rows['files'][] = $item->getFilename();
        }
    }
} catch (Exception $e) {
    $rows['status']['exception'] = $e->getMessage();
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($rows);