Собери урок номер $ARGUMENTS из сценария.

Номер дополни ведущим нулём до двух цифр: сценарий `scenarios/lesson-NN.md`,
результат `lessons/lesson-NN.json`.

Действуй строго по разделу «Как собрать урок из сценария» в `CLAUDE.md`:
сверка с планом, перенос без изменения содержания, `ipa`,
`npm run lessons:validate`, `npm run vocab:build`, `npm run vocab:check -- NN`,
`npm run check:slides -- --lesson=N`, затем краткий отчёт.

Если номер с буквой p (`p1`) — это практический урок: сценарий
`scenarios/practice-NN.md`, результат `lessons/practice-NN.json`. Отличия
сборки — раздел 8 `docs/practice-writing.md`.

Если файла сценария нет — скажи об этом и остановись.
