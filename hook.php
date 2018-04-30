<?php
$file = fopen("hook.txt", "r+");
$top1 = fscanf($file, "%d")[0];
$user = (int)$_POST["score"];
if ($top1 < $user) {
	fseek($file, 0, SEEK_SET);
	fprintf($file, "%d", $user);
	echo($user . "<abbr title='New Record !!'>*</abbr>");
} else {
	echo($top1);
}
fclose($file);
$vfile = fopen("vhook.txt", "r+");
$visit = fscanf($vfile, "%d")[0];
fseek($vfile, 0, SEEK_SET);
fprintf($vfile, "%d", ($visit + 1));
fclose($vfile);
?>
