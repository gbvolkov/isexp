import chalk from 'chalk';
import dedent from 'dedent';

const printError = (error: any) => {
	console.log(
		dedent(`${chalk.bgRed(' ERROR ')}
		${error}`)
	);
};

const printSuccess = (message: any) => {
	console.log(
		dedent(`${chalk.bgGreen(' SUCCESS ')}
		${message}`)
	);
};

const printHelp = () => {
	console.log(
		dedent(`${chalk.bgCyan(' HELP ')}
		Без параметров - печать помощи
		-o - оплаты подписок\n
		-a - новые активные пользователи 
		-l - старые пользователи
		-i - по id родителей
		-v - csv-файл c id родителей (обязателен, если указано -i)
		-c - количество пользователей (40 по умолчанию)
		-s - 0 - нет привязки к школе;
			 1 - есть привязка к школе;
			 по умолчанию - всё равно
		-t - мин количество решённых заданий (0 - default)
		-m - max количество студентов у родителя (1 - default)
		-f - csv-файл (обязательный параметр)
		`)
	);
};

/*
const printWeather = (weather: { name: any; weather: { description: string; }[]; main: { temp: any; feels_like: any; humidity: any; }; wind: { speed: any; }; }) => {
	//console.log(weather);
	console.log(
		dedent(`${chalk.bgBlue(` Погода в г.`)} ${weather.name}: ${chalk.italic(weather.weather[0].description)}
		${chalk.bold(`Температура:`)} \t\t\t${weather.main.temp} (${chalk.bold(`ощущается как`)} ${weather.main.feels_like})
		${chalk.bold(`Относительная влажность:`)}\t${weather.main.humidity} ${chalk.bold(`%`)}
		${chalk.bold(`Скорость ветра:`)}\t\t\t${weather.wind.speed} ${chalk.bold(`м/с`)}
		`)
	);
};
*/
export { printError, printSuccess, printHelp }; //, printWeather };