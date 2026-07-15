var rulesDataJson = [{
    "desc": "excel单元格清理",
    "rule": "[\\t\"]",
    "replace": "",
    "mode": 0
}, {
    "desc": "去除空行",
    "rule": "\\n+",
    "replace": "\\n",
    "mode": 0
}, {
    "desc": "SQL转一行",
    "rule": "\\s+",
    "replace": " ",
    "mode": 0
}, {
    "desc": "获取xml属性",
    "rule": "=\"(.*?)\"",
    "replace": "$1",
    "mode": 1
}]