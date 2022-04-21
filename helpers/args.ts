function getArgs(args: string[]) {
	const res: { [key: string]: any; } = {};
	const [executor, file, ...rest] = args; // executor = args[0]; file = args[1], rest = массив из остального

	/**
		Простецкая реализация разбора параметров.
		Просто для обучения.
	*/
	rest.forEach(function (value: string, index: number, array: string[]) {
		if (value.charAt(0) == '-') {
			if (index == array.length - 1) {
				res[value.substring(1)] = true;
			} else if (array[index + 1].charAt(0) != '-') {
				res[value.substring(1)] = array[index + 1];
			} else {
				res[value.substring(1)] = true;
			}
		}
	});

	return res;
}

export { getArgs }
